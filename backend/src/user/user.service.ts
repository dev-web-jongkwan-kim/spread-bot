import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { User } from '../database/entities/user.entity';
import { PlanType, Language, PLAN_LIMITS } from '../common/constants';

@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async getByTelegramId(telegramId: number): Promise<User | null> {
    return this.userRepo.findByTelegramId(telegramId);
  }

  async getById(id: string): Promise<User | null> {
    return this.userRepo.findById(id);
  }

  async getBySubscriptionId(subscriptionId: string): Promise<User | null> {
    return this.userRepo.findBySubscriptionId(subscriptionId);
  }

  async createOrUpdate(telegramId: number, userData: Partial<User>): Promise<User> {
    const existing = await this.userRepo.findByTelegramId(telegramId);
    if (existing) {
      return this.userRepo.update(existing.id, userData);
    }
    return this.userRepo.create({
      telegramId,
      language: Language.EN,
      plan: PlanType.FREE,
      threshold: 1.0,
      ...userData,
    });
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    return this.userRepo.update(id, userData);
  }

  async getAllMonitoredSymbols(): Promise<string[]> {
    const symbols = await this.userRepo.getAllMonitoredSymbols();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'user.service.ts:getAllMonitoredSymbols',message:'All monitored symbols',data:{symbols,symbolCount:symbols.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'AB'})}).catch(()=>{});
    // #endregion
    return symbols;
  }

  canAddCoin(user: User): boolean {
    const limits = PLAN_LIMITS[user.plan as PlanType];
    if (limits.maxCoins === -1) return true;
    const activeCoins = user.coins?.filter((c) => c.isActive).length || 0;
    return activeCoins < limits.maxCoins;
  }

  canAddExchange(user: User): boolean {
    const limits = PLAN_LIMITS[user.plan as PlanType];
    if (limits.maxExchanges === -1) return true;
    const activeExchanges = user.exchanges?.filter((e) => e.isActive).length || 0;
    return activeExchanges < limits.maxExchanges;
  }

  canSendAlert(user: User): boolean {
    const limits = PLAN_LIMITS[user.plan as PlanType];
    if (limits.dailyAlerts === -1) return true;
    const today = new Date().toISOString().split('T')[0];
    const resetDate = user.alertsResetAt?.toISOString().split('T')[0];
    if (resetDate !== today) {
      return true; // Will be reset
    }
    return user.dailyAlertsSent < limits.dailyAlerts;
  }

  isCurrentlyMuted(user: User): boolean {
    if (!user.isMuted) return false;
    if (!user.mutedUntil) return true;
    return new Date() < user.mutedUntil;
  }
}


