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
}


