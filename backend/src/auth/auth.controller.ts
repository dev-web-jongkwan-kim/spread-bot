import { Controller, Post, Get, Body, Request, Req, Res, UseGuards, UnauthorizedException, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { AuthGuard } from './auth.guard';
import { ConfigService } from '../config/config.service';
import { TelegramLoginDto } from './dto/telegram-login.dto';
import { Public } from '../common/decorators/public.decorator';
import * as crypto from 'crypto';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly config: ConfigService,
  ) {}

  private verifyTelegramAuth(telegramData: any): boolean {
    const { hash, ...dataToCheck } = telegramData;

    if (!hash) {
      throw new BadRequestException('Missing hash in Telegram auth data');
    }

    if (!dataToCheck.auth_date) {
      throw new BadRequestException('Missing auth_date in Telegram auth data');
    }

    const authDate = parseInt(dataToCheck.auth_date);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = currentTime - authDate;

    if (timeDiff > 300) {
      throw new UnauthorizedException('Telegram auth data is too old (max 5 minutes)');
    }

    const botToken = this.config.telegramBotToken;
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }

    const secretKey = crypto.createHash('sha256').update(botToken).digest();

    const dataCheckString = Object.keys(dataToCheck)
      .sort()
      .map((key) => `${key}=${dataToCheck[key]}`)
      .join('\n');

    const hmac = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return hmac === hash;
  }

  @Post('telegram')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  async loginWithTelegram(
    @Body() telegramData: TelegramLoginDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!this.verifyTelegramAuth(telegramData)) {
      throw new UnauthorizedException('Invalid Telegram authentication data');
    }

    const user = await this.userService.createOrUpdate(
      telegramData.id,
      {
        telegramId: telegramData.id,
        username: telegramData.username,
        firstName: telegramData.first_name,
        lastName: telegramData.last_name,
      },
    );

    // Generate tokens
    const token = this.authService.generateToken(user.id);
    const refreshToken = await this.authService.generateRefreshToken(
      user.id,
      req.headers['user-agent'],
      req.ip,
    );

    // Set HTTP-only cookies
    const isProduction = this.config.appEnv === 'production';
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    return {
      token, // Access token
      refreshToken, // Refresh token
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        telegram_id: user.telegramId,
        username: user.username,
        first_name: user.firstName,
        last_name: user.lastName,
        plan: user.plan,
        role: user.role || 'user',
        threshold: Number(user.threshold),
        coins: user.coins?.filter((c) => c.isActive).map((c) => c.symbol) || [],
        exchanges: user.exchanges?.filter((e) => e.isActive).map((e) => e.exchangeId) || [],
        daily_alerts_sent: user.dailyAlertsSent,
        created_at: user.createdAt,
      },
    };
  }

  @Post('refresh')
  @Public()
  async refresh(
    @Body() body: { refreshToken?: string },
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refresh_token || body.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    const result = await this.authService.refreshAccessToken(refreshToken);

    if (!result) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Set new tokens in cookies
    const isProduction = this.config.appEnv === 'production';
    res.cookie('auth_token', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    return {
      token: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: 900,
    };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Revoke refresh token if present
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await this.authService.revokeRefreshToken(refreshToken);
    }

    res.clearCookie('auth_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@Request() req: any) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized - Please login first');
    }

    const user = await this.userService.getById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      telegram_id: user.telegramId,
      username: user.username,
      first_name: user.firstName,
      last_name: user.lastName,
      plan: user.plan,
      role: user.role || 'user',
      threshold: Number(user.threshold),
      coins: user.coins?.filter((c) => c.isActive).map((c) => c.symbol) || [],
      exchanges: user.exchanges?.filter((e) => e.isActive).map((e) => e.exchangeId) || [],
      daily_alerts_sent: user.dailyAlertsSent,
      created_at: user.createdAt,
    };
  }

  // Development-only endpoint for quick testing
  @Post('dev-login')
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async devLogin(
    @Body() body: { account: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    // Only allow in development
    if (this.config.appEnv === 'production') {
      throw new UnauthorizedException('Dev login is not available in production');
    }

    const testAccounts = {
      'free': { id: 999000001, username: 'test_free', firstName: 'Test', lastName: 'Free', plan: 'free' },
      'pro': { id: 999000002, username: 'test_pro', firstName: 'Test', lastName: 'Pro', plan: 'pro' },
      'whale': { id: 999000003, username: 'test_whale', firstName: 'Test', lastName: 'Whale', plan: 'whale' },
      'new': { id: 999000004, username: 'test_new', firstName: 'Test', lastName: 'New', plan: 'free' },
      'admin': { id: 999000005, username: 'test_admin', firstName: 'Test', lastName: 'Admin', plan: 'whale' },
    };

    const accountData = testAccounts[body.account];
    if (!accountData) {
      throw new BadRequestException('Invalid test account');
    }

    // Create or update test user
    const user = await this.userService.createOrUpdate(
      accountData.id,
      {
        telegramId: accountData.id,
        username: accountData.username,
        firstName: accountData.firstName,
        lastName: accountData.lastName,
        plan: accountData.plan as any,
      },
    );

    // Set admin role if admin account
    if (body.account === 'admin') {
      await this.userService.update(user.id, { role: 'admin' } as any);
    }

    const token = this.authService.generateToken(user.id);

    // Set HTTP-only cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    // Fetch updated user with role
    const updatedUser = await this.userService.getById(user.id);

    if (!updatedUser) {
      throw new Error('User not found after creation');
    }

    return {
      token,
      user: {
        id: updatedUser.id,
        telegram_id: updatedUser.telegramId,
        username: updatedUser.username,
        first_name: updatedUser.firstName,
        last_name: updatedUser.lastName,
        plan: updatedUser.plan,
        role: updatedUser.role || 'user',
        threshold: Number(updatedUser.threshold),
        coins: updatedUser.coins?.filter((c) => c.isActive).map((c) => c.symbol) || [],
        exchanges: updatedUser.exchanges?.filter((e) => e.isActive).map((e) => e.exchangeId) || [],
        daily_alerts_sent: updatedUser.dailyAlertsSent,
        created_at: updatedUser.createdAt,
      },
    };
  }
}



