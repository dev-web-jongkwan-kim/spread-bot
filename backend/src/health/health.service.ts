import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectConnection()
    private readonly dbConnection: Connection,
    private readonly redisService: RedisService,
  ) {}

  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      memory: this.getMemoryUsage(),
    };

    const isHealthy = checks.database.status === 'ok' && checks.redis.status === 'ok';
    checks.status = isHealthy ? 'ok' : 'degraded';

    return checks;
  }

  async readiness() {
    const db = await this.checkDatabase();
    const redis = await this.checkRedis();

    const isReady = db.status === 'ok' && redis.status === 'ok';

    return {
      status: isReady ? 'ready' : 'not_ready',
      checks: {
        database: db,
        redis: redis,
      },
    };
  }

  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  private async checkDatabase() {
    try {
      await this.dbConnection.query('SELECT 1');
      return {
        status: 'ok',
        message: 'Database connection healthy',
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkRedis() {
    try {
      const client = this.redisService.getClient();
      await client.ping();
      return {
        status: 'ok',
        message: 'Redis connection healthy',
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`,
    };
  }
}

