import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Symbol } from '../database/entities/symbol.entity';
import { ExchangeSymbol } from '../database/entities/exchange-symbol.entity';
import { SymbolService } from './symbol.service';
import { SymbolController } from './symbol.controller';
import { ExchangeModule } from '../exchange/exchange.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Symbol, ExchangeSymbol]),
    ExchangeModule,
    AuthModule,
    UserModule,
  ],
  controllers: [SymbolController],
  providers: [SymbolService],
  exports: [SymbolService],
})
export class SymbolModule {}

