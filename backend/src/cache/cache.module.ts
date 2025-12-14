import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { RedisModule } from '../redis/redis.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [RedisModule, ConfigModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}


