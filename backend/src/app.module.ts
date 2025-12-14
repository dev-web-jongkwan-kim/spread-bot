import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
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
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule,
    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
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
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
