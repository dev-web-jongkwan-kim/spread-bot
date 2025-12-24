import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: any, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  /**
   * Set a key-value pair only if the key does not exist (atomic operation)
   * Returns true if the key was set, false if it already existed
   */
  async setNX(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    let result: string | null;

    if (ttlSeconds) {
      // SET key value EX seconds NX
      result = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');
    } else {
      // SET key value NX
      result = await this.redis.set(key, value, 'NX');
    }

    // Redis returns 'OK' if set successfully, null if key already exists
    return result === 'OK';
  }

  getClient(): Redis {
    return this.redis;
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}



