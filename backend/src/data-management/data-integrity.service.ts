import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Symbol } from '../database/entities/symbol.entity';
import { ExchangeSymbol } from '../database/entities/exchange-symbol.entity';
import { UnifiedSymbol } from '../database/entities/unified-symbol.entity';
import { UnifiedSymbolExchange } from '../database/entities/unified-symbol-exchange.entity';

@Injectable()
export class DataIntegrityService {
  private readonly logger = new Logger(DataIntegrityService.name);

  constructor(
    @InjectRepository(Symbol)
    private readonly symbolRepo: Repository<Symbol>,
    @InjectRepository(ExchangeSymbol)
    private readonly exchangeSymbolRepo: Repository<ExchangeSymbol>,
    @InjectRepository(UnifiedSymbol)
    private readonly unifiedSymbolRepo: Repository<UnifiedSymbol>,
    @InjectRepository(UnifiedSymbolExchange)
    private readonly unifiedExchangeRepo: Repository<UnifiedSymbolExchange>,
  ) {}

  /**
   * Verify symbol synchronization integrity
   */
  async verifySymbolIntegrity(): Promise<{
    valid: boolean;
    issues: string[];
    stats: {
      symbols: number;
      exchangeSymbols: number;
      unifiedSymbols: number;
      unifiedMappings: number;
    };
  }> {
    const issues: string[] = [];

    // Get counts
    const [symbols, exchangeSymbols, unifiedSymbols, unifiedMappings] = await Promise.all([
      this.symbolRepo.count({ where: { isActive: true } }),
      this.exchangeSymbolRepo.count({ where: { isActive: true } }),
      this.unifiedSymbolRepo.count({ where: { isActive: true } }),
      this.unifiedExchangeRepo.count({ where: { isActive: true } }),
    ]);

    // Check for orphaned exchange symbols
    const orphanedExchangeSymbols = await this.exchangeSymbolRepo
      .createQueryBuilder('es')
      .leftJoin('es.symbol', 'symbol')
      .where('symbol.id IS NULL')
      .getCount();

    if (orphanedExchangeSymbols > 0) {
      issues.push(`Found ${orphanedExchangeSymbols} orphaned exchange symbols`);
    }

    // Check for symbols without exchange mappings
    const symbolsWithoutMappings = await this.symbolRepo
      .createQueryBuilder('s')
      .leftJoin('s.exchangeSymbols', 'es')
      .where('s.isActive = true')
      .andWhere('es.id IS NULL')
      .getCount();

    if (symbolsWithoutMappings > 0) {
      issues.push(`Found ${symbolsWithoutMappings} symbols without exchange mappings`);
    }

    return {
      valid: issues.length === 0,
      issues,
      stats: {
        symbols,
        exchangeSymbols,
        unifiedSymbols,
        unifiedMappings,
      },
    };
  }

  /**
   * Fix common data integrity issues
   */
  async fixIntegrityIssues(): Promise<{ fixed: number; issues: string[] }> {
    let fixed = 0;
    const issues: string[] = [];

    // Remove orphaned exchange symbols
    const orphanedResult = await this.exchangeSymbolRepo
      .createQueryBuilder()
      .delete()
      .where('symbolId NOT IN (SELECT id FROM symbols)')
      .execute();

    if (orphanedResult.affected && orphanedResult.affected > 0) {
      fixed += orphanedResult.affected;
      issues.push(`Removed ${orphanedResult.affected} orphaned exchange symbols`);
    }

    return { fixed, issues };
  }
}

