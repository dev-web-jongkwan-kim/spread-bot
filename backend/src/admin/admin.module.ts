import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../database/entities/user.entity';
import { Alert } from '../database/entities/alert.entity';
import { UserCoin } from '../database/entities/user-coin.entity';
import { UserExchange } from '../database/entities/user-exchange.entity';
import { Symbol } from '../database/entities/symbol.entity';
import { ExchangeSymbol } from '../database/entities/exchange-symbol.entity';
import { Log } from '../database/entities/log.entity';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { SymbolModule } from '../symbol/symbol.module';
import { CoinGeckoModule } from '../coingecko/coingecko.module';
import { DataRetentionModule } from '../data-retention/data-retention.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Alert,
      UserCoin,
      UserExchange,
      Symbol,
      ExchangeSymbol,
      Log,
    ]),
    AuthModule,
    UserModule,
    SymbolModule,
    CoinGeckoModule,
    DataRetentionModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

