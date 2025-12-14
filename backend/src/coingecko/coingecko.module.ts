import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoinGeckoService } from './coingecko.service';
import { UnifiedSymbol } from '../database/entities/unified-symbol.entity';
import { UnifiedSymbolExchange } from '../database/entities/unified-symbol-exchange.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UnifiedSymbol, UnifiedSymbolExchange]),
  ],
  providers: [CoinGeckoService],
  exports: [CoinGeckoService],
})
export class CoinGeckoModule {}

