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

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbUrl = config.databaseUrl;
        // 데이터베이스 URL이 없거나 잘못된 경우 기본값 사용
        if (!dbUrl || dbUrl === '') {
          console.warn('DATABASE_URL not set, using default connection');
          return {
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            username: 'postgres',
            password: 'postgres',
            database: 'cryptospreadbot',
            entities: [User, UserCoin, UserExchange, Alert, Log, Symbol, ExchangeSymbol, UnifiedSymbol, UnifiedSymbolExchange],
            synchronize: config.appEnv === 'development',
            logging: config.appDebug,
            extra: {
              max: config.databasePoolSize,
              maxOverflow: config.databaseMaxOverflow,
            },
          };
        }
        return {
          type: 'postgres',
          url: dbUrl,
          entities: [User, UserCoin, UserExchange, Alert, Log, Symbol, ExchangeSymbol],
          synchronize: config.appEnv === 'development',
          logging: config.appDebug,
          extra: {
            max: config.databasePoolSize,
            maxOverflow: config.databaseMaxOverflow,
          },
        };
      },
    }),
    TypeOrmModule.forFeature([User, UserCoin, UserExchange, Alert, Log, Symbol, ExchangeSymbol, UnifiedSymbol, UnifiedSymbolExchange]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}



