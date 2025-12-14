import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { CacheModule } from './cache/cache.module';
import { ExchangeModule } from './exchange/exchange.module';
import { UserModule } from './user/user.module';
import { AlertModule } from './alert/alert.module';
import { PriceMonitorModule } from './price-monitor/price-monitor.module';
import { TelegramModule } from './telegram/telegram.module';
import { WebhookModule } from './webhook/webhook.module';
import { ApiModule } from './api/api.module';
import { AuthModule } from './auth/auth.module';
import { SymbolModule } from './symbol/symbol.module';
import { CoinGeckoModule } from './coingecko/coingecko.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RedisModule,
    CacheModule,
    ExchangeModule,
    UserModule,
    AlertModule,
    PriceMonitorModule,
    TelegramModule,
    WebhookModule,
    ApiModule,
    AuthModule,
    SymbolModule,
    CoinGeckoModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
