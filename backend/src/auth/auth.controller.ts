import { Controller, Post, Get, Body, Request, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { AuthGuard } from './auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('telegram')
  async loginWithTelegram(@Body() telegramData: any) {
    const user = await this.userService.createOrUpdate(
      telegramData.id,
      {
        telegramId: telegramData.id,
        username: telegramData.username,
        firstName: telegramData.first_name,
        lastName: telegramData.last_name,
      },
    );

    const token = this.authService.generateToken(user.id);
    return {
      token,
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
}



