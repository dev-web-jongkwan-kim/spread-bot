import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangeService } from './exchange.service';
import { CacheModule } from '../cache/cache.module';
import { ConfigModule } from '../config/config.module';
import { Symbol } from '../database/entities/symbol.entity';
import { ExchangeSymbol } from '../database/entities/exchange-symbol.entity';

@Module({
  imports: [
    CacheModule,
    ConfigModule,
    TypeOrmModule.forFeature([Symbol, ExchangeSymbol]),
  ],
  providers: [ExchangeService],
  exports: [ExchangeService],
})
export class ExchangeModule {}



