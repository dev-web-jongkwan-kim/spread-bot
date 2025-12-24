import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '../config/config.service';

@Injectable()
export class CacheService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async getPrice(exchangeId: string, symbol: string): Promise<any | null> {
    const key = `price:${exchangeId}:${symbol}`;
    return this.redis.getJson(key);
  }

  async setPrice(
    exchangeId: string,
    symbol: string,
    data: any,
  ): Promise<void> {
    const key = `price:${exchangeId}:${symbol}`;
    await this.redis.setJson(
      key,
      data,
      this.config.priceCacheTtlSeconds,
    );
  }

  async getCooldown(
    userId: string,
    symbol: string,
    buyExchange: string,
    sellExchange: string,
  ): Promise<string | null> {
    const key = `cooldown:${userId}:${symbol}:${buyExchange}:${sellExchange}`;
    return this.redis.get(key);
  }

  async setCooldown(
    userId: string,
    symbol: string,
    buyExchange: string,
    sellExchange: string,
  ): Promise<void> {
    const key = `cooldown:${userId}:${symbol}:${buyExchange}:${sellExchange}`;
    await this.redis.set(
      key,
      new Date().toISOString(),
      this.config.alertCooldownSeconds,
    );
  }

  /**
   * Atomically check and set cooldown in a single operation
   * Returns true if cooldown was successfully set (not in cooldown)
   * Returns false if already in cooldown
   */
  async checkAndSetCooldown(
    userId: string,
    symbol: string,
    buyExchange: string,
    sellExchange: string,
  ): Promise<boolean> {
    const key = `cooldown:${userId}:${symbol}:${buyExchange}:${sellExchange}`;
    const value = new Date().toISOString();
    const ttl = this.config.alertCooldownSeconds;

    // Use Redis SET with NX (only set if not exists) and EX (expiration)
    // This is atomic - no race condition possible
    const result = await this.redis.setNX(key, value, ttl);
    return result;
  }
}


