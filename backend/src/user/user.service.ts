import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { User } from '../database/entities/user.entity';
import { PlanType, Language, PLAN_LIMITS } from '../common/constants';

@Injectable()
export class UserService {
  private cacheInvalidators: Array<(userId: string) => void> = [];

  constructor(private readonly userRepo: UserRepository) {}

  // Register a cache invalidator (used by AuthGuard)
  registerCacheInvalidator(invalidator: (userId: string) => void): void {
    this.cacheInvalidators.push(invalidator);
  }

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
    const updated = await this.userRepo.update(id, userData);

    // Invalidate cache for this user
    this.cacheInvalidators.forEach((invalidator) => invalidator(id));

    return updated;
  }

  async getAllMonitoredSymbols(): Promise<string[]> {
    const symbols = await this.userRepo.getAllMonitoredSymbols();
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


