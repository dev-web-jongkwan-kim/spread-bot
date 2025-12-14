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
    const user = await this.userRepo.findOne({
      where: { telegramId },
    });
    if (!user) return null;
    return this.loadRelations(user);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.userRepo.findOne({
      where: { id },
    });
    if (!user) return null;
    return this.loadRelations(user);
  }

  async findBySubscriptionId(subscriptionId: string): Promise<User | null> {
    const user = await this.userRepo.findOne({
      where: { lsSubscriptionId: subscriptionId },
    });
    if (!user) return null;
    return this.loadRelations(user);
  }

  private async loadRelations(user: User): Promise<User> {
    const [coins, exchanges] = await Promise.all([
      this.userCoinRepo.find({ where: { userId: user.id } }),
      this.userExchangeRepo.find({ where: { userId: user.id } }),
    ]);
    user.coins = coins;
    user.exchanges = exchanges;
    return user;
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'user.repository.ts:getUsersMonitoringSymbol',message:'Finding users monitoring symbol',data:{symbol,exchanges},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'S'})}).catch(()=>{});
    // #endregion
    
    const users = await this.userRepo
      .createQueryBuilder('user')
      .innerJoin('user_coins', 'coin', 'coin.userId = user.id AND coin.symbol = :symbol AND coin.isActive = true', {
        symbol,
      })
      .innerJoin('user_exchanges', 'exchange', 'exchange.userId = user.id AND exchange.isActive = true')
      .where('exchange.exchangeId IN (:...exchanges)', { exchanges })
      .andWhere('(user.isMuted = false OR user.mutedUntil < NOW())')
      .groupBy('user.id')
      .having('COUNT(DISTINCT exchange.exchangeId) >= 2')
      .getMany();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'user.repository.ts:getUsersMonitoringSymbol',message:'Users found from query',data:{symbol,userCount:users.length,userIds:users.map(u=>u.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'T'})}).catch(()=>{});
    // #endregion
    
    // Load relations for each user
    const usersWithRelations = await Promise.all(users.map(u => this.loadRelations(u)));
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'user.repository.ts:getUsersMonitoringSymbol',message:'Users with relations loaded',data:{symbol,userCount:usersWithRelations.length,users:usersWithRelations.map(u=>({id:u.id,telegramId:u.telegramId,threshold:Number(u.threshold),coins:u.coins?.filter(c=>c.isActive).map(c=>c.symbol),exchanges:u.exchanges?.filter(e=>e.isActive).map(e=>e.exchangeId)}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'U'})}).catch(()=>{});
    // #endregion
    
    return usersWithRelations;
  }

  async getAllMonitoredSymbols(): Promise<string[]> {
    const coins = await this.userCoinRepo.find({
      where: { isActive: true },
      select: ['symbol'],
    });
    const symbols = [...new Set(coins.map((c) => c.symbol))];
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'user.repository.ts:getAllMonitoredSymbols',message:'All monitored symbols from DB',data:{symbols,symbolCount:symbols.length,coinCount:coins.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'AC'})}).catch(()=>{});
    // #endregion
    return symbols;
  }
}


