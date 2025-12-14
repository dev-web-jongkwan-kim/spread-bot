import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from '../database/entities/alert.entity';
import { AlertService } from './alert.service';
import { UserModule } from '../user/user.module';
import { CacheModule } from '../cache/cache.module';
import { ConfigModule } from '../config/config.module';
import { ExchangeModule } from '../exchange/exchange.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert]),
    UserModule,
    CacheModule,
    ConfigModule,
    ExchangeModule,
    QueueModule,
  ],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}



