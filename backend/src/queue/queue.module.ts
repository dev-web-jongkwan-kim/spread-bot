import { Module, Global } from '@nestjs/common';
import { QueueService } from './queue.service';
import { RedisService } from '../redis/redis.service';

@Global()
@Module({
  providers: [QueueService, RedisService],
  exports: [QueueService],
})
export class QueueModule {}

