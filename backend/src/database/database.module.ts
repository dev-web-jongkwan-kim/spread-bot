import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { User } from './entities/user.entity';
import { UserCoin } from './entities/user-coin.entity';
import { UserExchange } from './entities/user-exchange.entity';
import { Alert } from './entities/alert.entity';
import { Log } from './entities/log.entity';
import { Symbol } from './entities/symbol.entity';
import { ExchangeSymbol } from './entities/exchange-symbol.entity';
import { UnifiedSymbol } from './entities/unified-symbol.entity';
import { UnifiedSymbolExchange } from './entities/unified-symbol-exchange.entity';
import { WebhookEvent } from './entities/webhook-event.entity';
import { RefreshToken } from './entities/refresh-token.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbUrl = config.databaseUrl;

        if (!dbUrl || dbUrl === '') {
          throw new Error('DATABASE_URL is required but not configured');
        }

        return {
          type: 'postgres',
          url: dbUrl,
          entities: [User, UserCoin, UserExchange, Alert, Log, Symbol, ExchangeSymbol, UnifiedSymbol, UnifiedSymbolExchange, WebhookEvent, RefreshToken],
          synchronize: false, // Always use migrations in production
          logging: config.appDebug,
          ssl: config.appEnv === 'production' ? { rejectUnauthorized: false } : false,
          extra: {
            max: config.appEnv === 'production' ? 20 : config.databasePoolSize, // Increase pool size for production
            connectionTimeoutMillis: 5000,
            idleTimeoutMillis: 30000, // Close idle connections after 30s
            statement_timeout: 30000, // 30s query timeout
          },
        };
      },
    }),
    TypeOrmModule.forFeature([User, UserCoin, UserExchange, Alert, Log, Symbol, ExchangeSymbol, UnifiedSymbol, UnifiedSymbolExchange, WebhookEvent, RefreshToken]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}



