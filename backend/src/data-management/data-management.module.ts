import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataIntegrityService } from './data-integrity.service';
import { Symbol } from '../database/entities/symbol.entity';
import { ExchangeSymbol } from '../database/entities/exchange-symbol.entity';
import { UnifiedSymbol } from '../database/entities/unified-symbol.entity';
import { UnifiedSymbolExchange } from '../database/entities/unified-symbol-exchange.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Symbol, ExchangeSymbol, UnifiedSymbol, UnifiedSymbolExchange]),
  ],
  providers: [DataIntegrityService],
  exports: [DataIntegrityService],
})
export class DataManagementModule {}

