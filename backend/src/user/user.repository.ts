import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { UserCoin } from '../database/entities/user-coin.entity';
import { UserExchange } from '../database/entities/user-exchange.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserCoin)
    private readonly userCoinRepo: Repository<UserCoin>,
    @InjectRepository(UserExchange)
    private readonly userExchangeRepo: Repository<UserExchange>,
  ) {}

  async findByTelegramId(telegramId: number): Promise<User | null> {
    return this.userRepo.findOne({
      where: { telegramId },
      relations: ['coins', 'exchanges'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id },
      relations: ['coins', 'exchanges'],
    });
  }

  async findBySubscriptionId(subscriptionId: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { lsSubscriptionId: subscriptionId },
      relations: ['coins', 'exchanges'],
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepo.create(userData);
    return this.userRepo.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    await this.userRepo.update(id, userData);
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');
    return user;
  }

  async incrementDailyAlerts(id: string): Promise<void> {
    await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({
        dailyAlertsSent: () =>
          `CASE WHEN alerts_reset_at < CURRENT_DATE THEN 1 ELSE daily_alerts_sent + 1 END`,
        alertsResetAt: () => 'CURRENT_DATE',
      })
      .where('id = :id', { id })
      .execute();
  }

  async getUsersMonitoringSymbol(
    symbol: string,
    exchanges: string[],
  ): Promise<User[]> {

    const users = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.coins', 'coins')
      .leftJoinAndSelect('user.exchanges', 'exchanges')
      .innerJoin('user_coins', 'coin', 'coin.userId = user.id AND coin.symbol = :symbol AND coin.isActive = true', {
        symbol,
      })
      .innerJoin('user_exchanges', 'exchange', 'exchange.userId = user.id AND exchange.isActive = true')
      .where('exchange.exchangeId IN (:...exchanges)', { exchanges })
      .andWhere('(user.isMuted = false OR user.mutedUntil < NOW())')
      .groupBy('user.id')
      .addGroupBy('coins.id')
      .addGroupBy('exchanges.id')
      .having('COUNT(DISTINCT exchange.exchangeId) >= 2')
      .getMany();

    return users;
  }

  async getAllMonitoredSymbols(): Promise<string[]> {
    const coins = await this.userCoinRepo.find({
      where: { isActive: true },
      select: ['symbol'],
    });
    const symbols = [...new Set(coins.map((c) => c.symbol))];
    return symbols;
  }
}


