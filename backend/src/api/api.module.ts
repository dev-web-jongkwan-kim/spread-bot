import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiController } from './api.controller';
import { LogController } from './log.controller';
import { Alert } from '../database/entities/alert.entity';
import { User } from '../database/entities/user.entity';
import { UserCoin } from '../database/entities/user-coin.entity';
import { UserExchange } from '../database/entities/user-exchange.entity';
import { Log } from '../database/entities/log.entity';
import { UnifiedSymbol } from '../database/entities/unified-symbol.entity';
import { UnifiedSymbolExchange } from '../database/entities/unified-symbol-exchange.entity';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ExchangeModule } from '../exchange/exchange.module';
import { SymbolModule } from '../symbol/symbol.module';
import { CoinGeckoModule } from '../coingecko/coingecko.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, User, UserCoin, UserExchange, Log, UnifiedSymbol, UnifiedSymbolExchange]),
    UserModule,
    AuthModule,
    SubscriptionModule,
    ExchangeModule,
    SymbolModule,
    CoinGeckoModule,
  ],
  controllers: [ApiController, LogController],
})
export class ApiModule {}



