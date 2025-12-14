import { Injectable } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

// jsonwebtoken이 설치되지 않은 경우를 대비한 간단한 토큰 생성
@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  generateToken(userId: string): string {
    // 간단한 base64 인코딩 토큰 (실제 프로덕션에서는 JWT 사용 권장)
    const payload = {
      id: userId,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30일
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  verifyToken(token: string): any {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      if (payload.exp && payload.exp < Date.now()) {
        return null; // 만료됨
      }
      return payload;
    } catch {
      return null;
    }
  }
}


