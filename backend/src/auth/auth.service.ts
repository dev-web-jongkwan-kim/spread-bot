import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '../config/config.service';
import { RefreshToken } from '../database/entities/refresh-token.entity';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  generateToken(userId: string): string {
    const payload = {
      id: userId,
      iat: Math.floor(Date.now() / 1000),
    };

    const secret = this.config.jwtSecret;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    // Short-lived access token (15 minutes)
    return jwt.sign(payload, secret, {
      expiresIn: '15m',
    });
  }

  async generateRefreshToken(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<string> {
    // Generate cryptographically secure random token
    const token = crypto.randomBytes(64).toString('hex');

    // Refresh token valid for 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.refreshTokenRepo.save({
      token,
      userId,
      expiresAt,
      userAgent,
      ipAddress,
    });

    return token;
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    const tokenRecord = await this.refreshTokenRepo.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!tokenRecord || tokenRecord.isRevoked) {
      return null;
    }

    if (new Date() > tokenRecord.expiresAt) {
      // Token expired, delete it
      await this.refreshTokenRepo.delete(tokenRecord.id);
      return null;
    }

    // Generate new access token
    const accessToken = this.generateToken(tokenRecord.userId);

    // Rotate refresh token for security
    const newRefreshToken = await this.generateRefreshToken(
      tokenRecord.userId,
      tokenRecord.userAgent ?? undefined,
      tokenRecord.ipAddress ?? undefined,
    );

    // Revoke old refresh token
    await this.refreshTokenRepo.update(tokenRecord.id, { isRevoked: true });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async revokeRefreshToken(token: string): Promise<boolean> {
    const result = await this.refreshTokenRepo.update(
      { token },
      { isRevoked: true },
    );
    return (result.affected ?? 0) > 0;
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.refreshTokenRepo.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  verifyToken(token: string): any {
    try {
      const secret = this.config.jwtSecret;
      if (!secret) {
        throw new Error('JWT_SECRET is not configured');
      }

      const payload = jwt.verify(token, secret);
      return payload;
    } catch (error) {
      return null;
    }
  }
}


