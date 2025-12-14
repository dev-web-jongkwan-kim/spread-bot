import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Symbol } from '../database/entities/symbol.entity';
import { ExchangeSymbol } from '../database/entities/exchange-symbol.entity';
import { ExchangeService } from '../exchange/exchange.service';
import { SUPPORTED_EXCHANGES } from '../common/constants';

@Injectable()
export class SymbolService {
  private readonly logger = new Logger(SymbolService.name);

  constructor(
    @InjectRepository(Symbol)
    private readonly symbolRepo: Repository<Symbol>,
    @InjectRepository(ExchangeSymbol)
    private readonly exchangeSymbolRepo: Repository<ExchangeSymbol>,
    private readonly exchangeService: ExchangeService,
  ) {}

  /**
   * 바이낸스에서 심볼 목록을 가져와서 DB에 동기화
   */
  async syncSymbolsFromBinance(): Promise<void> {
    this.logger.log('[SYMBOL SYNC] ==========================================');
    this.logger.log('[SYMBOL SYNC] Starting symbol sync from Binance...');
    this.logger.log('[SYMBOL SYNC] ==========================================');
    
    try {
      // ExchangeService 초기화 확인
      this.logger.log('[SYMBOL SYNC] Ensuring ExchangeService is initialized...');
      await this.exchangeService.initialize();
      
      // 바이낸스 거래소 인스턴스 확인
      const binanceExchange = this.exchangeService.getExchange('binance');
      if (!binanceExchange) {
        this.logger.error('[SYMBOL SYNC] ERROR: Binance exchange not initialized!');
        this.logger.error('[SYMBOL SYNC] Available exchanges:', Object.keys(SUPPORTED_EXCHANGES).join(', '));
        throw new Error('Binance exchange not initialized');
      }
      this.logger.log('[SYMBOL SYNC] Binance exchange instance found');
      
      // DB에 기존 심볼 개수 확인
      const existingCount = await this.symbolRepo.count({ where: { isActive: true } });
      this.logger.log(`[SYMBOL SYNC] Existing active symbols in DB: ${existingCount}`);
      
      // 바이낸스에서 심볼 목록 가져오기
      this.logger.log('[SYMBOL SYNC] Fetching symbols from Binance...');
      const binanceSymbols = await this.exchangeService.getSymbols('binance');
      this.logger.log(`[SYMBOL SYNC] Found ${binanceSymbols.length} symbols from Binance`);
      
      if (binanceSymbols.length === 0) {
        this.logger.error('[SYMBOL SYNC] ==========================================');
        this.logger.error('[SYMBOL SYNC] ERROR: No symbols received from Binance!');
        this.logger.error('[SYMBOL SYNC] This could indicate:');
        this.logger.error('[SYMBOL SYNC]   1. Network connectivity issue');
        this.logger.error('[SYMBOL SYNC]   2. Binance API rate limiting');
        this.logger.error('[SYMBOL SYNC]   3. Exchange initialization failure');
        this.logger.error('[SYMBOL SYNC]   4. Market loading failure');
        this.logger.error('[SYMBOL SYNC] ==========================================');
        throw new Error('No symbols received from Binance');
      }
      
      this.logger.log(`[SYMBOL SYNC] Sample symbols from Binance: ${binanceSymbols.slice(0, 10).join(', ')}`);

      // DB에 심볼 저장/업데이트
      let createdCount = 0;
      let reactivatedCount = 0;
      let updatedCount = 0;
      
      this.logger.log(`[SYMBOL SYNC] Processing ${binanceSymbols.length} symbols...`);
      
      for (let i = 0; i < binanceSymbols.length; i++) {
        const symbolName = binanceSymbols[i];
        
        if (i > 0 && i % 100 === 0) {
          this.logger.log(`[SYMBOL SYNC] Progress: ${i}/${binanceSymbols.length} symbols processed...`);
        }
        
        let symbol = await this.symbolRepo.findOne({
          where: { symbol: symbolName },
        });

        if (!symbol) {
          symbol = this.symbolRepo.create({
            symbol: symbolName,
            isActive: true,
          });
          await this.symbolRepo.save(symbol);
          createdCount++;
          if (createdCount <= 10) {
            this.logger.debug(`[SYMBOL SYNC] Created symbol: ${symbolName}`);
          }
        } else if (!symbol.isActive) {
          symbol.isActive = true;
          await this.symbolRepo.save(symbol);
          reactivatedCount++;
          if (reactivatedCount <= 10) {
            this.logger.debug(`[SYMBOL SYNC] Reactivated symbol: ${symbolName}`);
          }
        } else {
          updatedCount++;
        }
      }
      
      const finalCount = await this.symbolRepo.count({ where: { isActive: true } });
      
      this.logger.log('[SYMBOL SYNC] ==========================================');
      this.logger.log(`[SYMBOL SYNC] Binance sync completed:`);
      this.logger.log(`[SYMBOL SYNC]   - Symbols from Binance: ${binanceSymbols.length}`);
      this.logger.log(`[SYMBOL SYNC]   - Created: ${createdCount}`);
      this.logger.log(`[SYMBOL SYNC]   - Reactivated: ${reactivatedCount}`);
      this.logger.log(`[SYMBOL SYNC]   - Already existed: ${updatedCount}`);
      this.logger.log(`[SYMBOL SYNC]   - Total active symbols in DB: ${finalCount}`);
      this.logger.log('[SYMBOL SYNC] ==========================================');

      // 바이낸스에 없는 심볼은 비활성화
      this.logger.log('[SYMBOL SYNC] Deactivating symbols not in Binance...');
      const allDbSymbols = await this.symbolRepo.find();
      let deactivatedCount = 0;
      for (const dbSymbol of allDbSymbols) {
        if (!binanceSymbols.includes(dbSymbol.symbol) && dbSymbol.isActive) {
          dbSymbol.isActive = false;
          await this.symbolRepo.save(dbSymbol);
          deactivatedCount++;
          if (deactivatedCount <= 10) {
            this.logger.debug(`[SYMBOL SYNC] Deactivated symbol: ${dbSymbol.symbol}`);
          }
        }
      }
      
      if (deactivatedCount > 0) {
        this.logger.log(`[SYMBOL SYNC] Deactivated ${deactivatedCount} symbols not in Binance`);
      }
      
      const finalFinalCount = await this.symbolRepo.count({ where: { isActive: true } });
      this.logger.log(`[SYMBOL SYNC] Final active symbols count: ${finalFinalCount}`);
      
      // 바이낸스 exchange_symbols 매핑도 생성/업데이트
      this.logger.log('[SYMBOL SYNC] Creating/updating Binance exchange_symbols mappings...');
      let binanceMappingCreated = 0;
      let binanceMappingUpdated = 0;
      
      for (const symbolName of binanceSymbols) {
        const dbSymbol = await this.symbolRepo.findOne({
          where: { symbol: symbolName },
        });
        
        if (!dbSymbol) continue;
        
        let exchangeSymbol = await this.exchangeSymbolRepo.findOne({
          where: {
            symbolId: dbSymbol.id,
            exchangeId: 'binance',
          },
        });
        
        if (!exchangeSymbol) {
          exchangeSymbol = this.exchangeSymbolRepo.create({
            symbolId: dbSymbol.id,
            exchangeId: 'binance',
            exchangeSymbol: symbolName, // 바이낸스에서는 심볼명이 동일
            isActive: true,
          });
          await this.exchangeSymbolRepo.save(exchangeSymbol);
          binanceMappingCreated++;
        } else {
          exchangeSymbol.isActive = true;
          exchangeSymbol.exchangeSymbol = symbolName;
          await this.exchangeSymbolRepo.save(exchangeSymbol);
          binanceMappingUpdated++;
        }
      }
      
      this.logger.log(`[SYMBOL SYNC] Binance exchange_symbols: created=${binanceMappingCreated}, updated=${binanceMappingUpdated}`);
      
    } catch (error) {
      this.logger.error('[SYMBOL SYNC] ==========================================');
      this.logger.error(`[SYMBOL SYNC] Failed to sync symbols from Binance: ${error.message}`);
      if (error instanceof Error) {
        this.logger.error(`[SYMBOL SYNC] Error stack: ${error.stack}`);
      }
      this.logger.error('[SYMBOL SYNC] ==========================================');
      throw error;
    }
  }

  /**
   * 각 거래소에서 심볼 목록을 가져와서 exchange_symbols 테이블에 매핑
   */
  async syncExchangeSymbols(): Promise<void> {
    this.logger.log('[SYMBOL SYNC] ==========================================');
    this.logger.log('[SYMBOL SYNC] Starting exchange symbol sync...');
    this.logger.log('[SYMBOL SYNC] ==========================================');
    
    // DB에서 활성 심볼 목록 가져오기
    const dbSymbols = await this.symbolRepo.find({
      where: { isActive: true },
    });
    this.logger.log(`[SYMBOL SYNC] Found ${dbSymbols.length} active symbols in DB to sync`);
    
    if (dbSymbols.length === 0) {
      this.logger.warn('[SYMBOL SYNC] WARNING: No active symbols in DB! Run Binance sync first.');
      return;
    }

    const exchangeIds = Object.keys(SUPPORTED_EXCHANGES);
    const exchangeStats: Record<string, { created: number; reactivated: number; deactivated: number; total: number }> = {};
    
    this.logger.log(`[SYMBOL SYNC] Syncing for ${exchangeIds.length} exchanges: ${exchangeIds.join(', ')}`);
    
    for (const exchangeId of exchangeIds) {
      try {
        this.logger.log(`[SYMBOL SYNC] Syncing symbols for ${exchangeId}...`);
        
        // 거래소에서 심볼 매핑 가져오기 (base -> exchange symbol)
        const symbolMapping = await this.exchangeService.getSymbolMapping(exchangeId);
        this.logger.log(`[SYMBOL SYNC] Found ${symbolMapping.size} symbol mappings from ${exchangeId}`);
        
        // 매핑된 심볼 Set 생성 (대소문자 무시 비교용)
        const mappedSymbolsSet = new Set<string>();
        const symbolMapUpper = new Map<string, string>(); // 대문자 키 -> 원본 값
        for (const [base, exchangeSymbol] of symbolMapping.entries()) {
          const upperBase = base.toUpperCase();
          mappedSymbolsSet.add(upperBase);
          symbolMapUpper.set(upperBase, exchangeSymbol);
        }
        
        let created = 0;
        let reactivated = 0;
        let deactivated = 0;
        let notFound: string[] = [];

        // 각 DB 심볼에 대해 거래소 심볼 매핑
        for (let i = 0; i < dbSymbols.length; i++) {
          const dbSymbol = dbSymbols[i];
          
          if (i > 0 && i % 500 === 0) {
            this.logger.log(`[SYMBOL SYNC] ${exchangeId}: Processing ${i}/${dbSymbols.length} symbols...`);
          }
          
          // 바이낸스 기준 심볼명이 해당 거래소에 존재하는지 확인 (대소문자 무시)
          const dbSymbolUpper = dbSymbol.symbol.toUpperCase();
          const existsInExchange = mappedSymbolsSet.has(dbSymbolUpper);

          if (existsInExchange) {
            // 거래소에서 실제 사용하는 심볼명 가져오기
            const exchangeSymbolName = symbolMapUpper.get(dbSymbolUpper) || dbSymbol.symbol;
            
            // 매핑이 없으면 생성, 있으면 활성화 및 업데이트
            let exchangeSymbol = await this.exchangeSymbolRepo.findOne({
              where: {
                symbolId: dbSymbol.id,
                exchangeId: exchangeId,
              },
            });

            if (!exchangeSymbol) {
              exchangeSymbol = this.exchangeSymbolRepo.create({
                symbolId: dbSymbol.id,
                exchangeId: exchangeId,
                exchangeSymbol: exchangeSymbolName, // 거래소에서 실제 사용하는 심볼명
                isActive: true,
              });
              await this.exchangeSymbolRepo.save(exchangeSymbol);
              created++;
              if (created <= 10) {
                this.logger.debug(`[SYMBOL SYNC] Created mapping: ${dbSymbol.symbol} -> ${exchangeSymbolName} on ${exchangeId}`);
              }
            } else {
              // 기존 매핑이 있으면 심볼명 업데이트 및 활성화
              const wasInactive = !exchangeSymbol.isActive;
              exchangeSymbol.isActive = true;
              exchangeSymbol.exchangeSymbol = exchangeSymbolName; // 거래소 실제 심볼명으로 업데이트
              await this.exchangeSymbolRepo.save(exchangeSymbol);
              if (wasInactive) {
                reactivated++;
                if (reactivated <= 10) {
                  this.logger.debug(`[SYMBOL SYNC] Reactivated mapping: ${dbSymbol.symbol} -> ${exchangeSymbolName} on ${exchangeId}`);
                }
              }
            }
          } else {
            // 거래소에 없는 심볼은 비활성화
            notFound.push(dbSymbol.symbol);
            const exchangeSymbol = await this.exchangeSymbolRepo.findOne({
              where: {
                symbolId: dbSymbol.id,
                exchangeId: exchangeId,
              },
            });

            if (exchangeSymbol && exchangeSymbol.isActive) {
              exchangeSymbol.isActive = false;
              await this.exchangeSymbolRepo.save(exchangeSymbol);
              deactivated++;
              if (deactivated <= 10) {
                this.logger.debug(`[SYMBOL SYNC] Deactivated mapping: ${dbSymbol.symbol} on ${exchangeId}`);
              }
            }
          }
        }
        
        if (notFound.length > 0 && notFound.length <= 20) {
          this.logger.log(`[SYMBOL SYNC] Symbols not found on ${exchangeId}: ${notFound.join(', ')}`);
        } else if (notFound.length > 20) {
          this.logger.log(`[SYMBOL SYNC] ${notFound.length} symbols not found on ${exchangeId} (first 20: ${notFound.slice(0, 20).join(', ')})`);
        }
        
        const totalActive = await this.exchangeSymbolRepo.count({
          where: { exchangeId, isActive: true },
        });
        
        exchangeStats[exchangeId] = { created, reactivated, deactivated, total: totalActive };
        this.logger.log(`[SYMBOL SYNC] Completed sync for ${exchangeId}: created=${created}, reactivated=${reactivated}, deactivated=${deactivated}, total_active=${totalActive}`);
      } catch (error) {
        this.logger.error(`[SYMBOL SYNC] Failed to sync symbols for ${exchangeId}: ${error.message}`);
        if (error instanceof Error) {
          this.logger.error(`[SYMBOL SYNC] Error stack: ${error.stack}`);
        }
        // 계속 진행
      }
    }

    this.logger.log('[SYMBOL SYNC] ==========================================');
    this.logger.log('[SYMBOL SYNC] Exchange symbol sync completed');
    this.logger.log('[SYMBOL SYNC] Summary:');
    for (const [exchangeId, stats] of Object.entries(exchangeStats)) {
      this.logger.log(`[SYMBOL SYNC]   ${exchangeId}: ${stats.total} active symbols (created: ${stats.created}, reactivated: ${stats.reactivated}, deactivated: ${stats.deactivated})`);
    }
    this.logger.log('[SYMBOL SYNC] ==========================================');
  }

  /**
   * 전체 동기화: 바이낸스 심볼 먼저, 그 다음 거래소별 매핑
   */
  async syncAll(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('[SYMBOL SYNC] ==========================================');
    this.logger.log('[SYMBOL SYNC] Starting FULL symbol sync...');
    this.logger.log('[SYMBOL SYNC] ==========================================');
    
    try {
      // Step 1: 바이낸스 심볼 동기화
      this.logger.log('[SYMBOL SYNC] Step 1/2: Syncing Binance symbols...');
      await this.syncSymbolsFromBinance();
      
      // Step 2: 거래소별 매핑 동기화
      this.logger.log('[SYMBOL SYNC] Step 2/2: Syncing exchange symbol mappings...');
      await this.syncExchangeSymbols();
      
      const duration = Date.now() - startTime;
      const totalSymbols = await this.symbolRepo.count({ where: { isActive: true } });
      const totalMappings = await this.exchangeSymbolRepo.count({ where: { isActive: true } });
      
      this.logger.log('[SYMBOL SYNC] ==========================================');
      this.logger.log('[SYMBOL SYNC] FULL symbol sync completed successfully!');
      this.logger.log(`[SYMBOL SYNC] Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
      this.logger.log(`[SYMBOL SYNC] Total active symbols: ${totalSymbols}`);
      this.logger.log(`[SYMBOL SYNC] Total active exchange mappings: ${totalMappings}`);
      this.logger.log('[SYMBOL SYNC] ==========================================');
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('[SYMBOL SYNC] ==========================================');
      this.logger.error('[SYMBOL SYNC] FULL symbol sync FAILED!');
      this.logger.error(`[SYMBOL SYNC] Duration before failure: ${duration}ms`);
      this.logger.error(`[SYMBOL SYNC] Error: ${error}`);
      if (error instanceof Error) {
        this.logger.error(`[SYMBOL SYNC] Error message: ${error.message}`);
        this.logger.error(`[SYMBOL SYNC] Error stack: ${error.stack}`);
      }
      this.logger.error('[SYMBOL SYNC] ==========================================');
      throw error;
    }
  }

  /**
   * 활성 심볼 목록 조회 (바이낸스 기준)
   */
  async getActiveSymbols(search?: string): Promise<string[]> {
    this.logger.log(`[SYMBOL SERVICE] getActiveSymbols called with search: "${search}"`);
    
    const query = this.symbolRepo
      .createQueryBuilder('symbol')
      .where('symbol.isActive = :isActive', { isActive: true })
      .orderBy('symbol.symbol', 'ASC');

    if (search && search.trim()) {
      query.andWhere('symbol.symbol ILIKE :search', {
        search: `%${search.trim().toUpperCase()}%`,
      });
    }

    const symbols = await query.getMany();
    const result = symbols.map((s) => s.symbol);
    
    this.logger.log(`[SYMBOL SERVICE] Found ${result.length} active symbols${search ? ` matching "${search}"` : ''}`);
    
    return result;
  }

  /**
   * 심볼의 거래소별 지원 여부 조회
   */
  async getSymbolAvailability(
    symbols: string[],
    exchangeIds: string[],
  ): Promise<Record<string, Record<string, boolean>>> {
    const result: Record<string, Record<string, boolean>> = {};

    if (symbols.length === 0) return result;

    // DB에서 심볼 조회 (relations 포함)
    const dbSymbols = await this.symbolRepo.find({
      where: { symbol: In(symbols), isActive: true },
      relations: ['exchangeSymbols'],
    });

    // 각 심볼에 대해 거래소별 지원 여부 확인
    for (const dbSymbol of dbSymbols) {
      result[dbSymbol.symbol] = {};
      
      for (const exchangeId of exchangeIds) {
        const exchangeSymbol = dbSymbol.exchangeSymbols?.find(
          (es) => es.exchangeId === exchangeId && es.isActive,
        );
        result[dbSymbol.symbol][exchangeId] = !!exchangeSymbol;
      }
    }

    // DB에 없는 심볼은 모두 false로 설정
    for (const symbol of symbols) {
      if (!result[symbol]) {
        result[symbol] = {};
        for (const exchangeId of exchangeIds) {
          result[symbol][exchangeId] = false;
        }
      }
    }

    return result;
  }

  /**
   * 특정 거래소에서 지원하는 심볼 목록 조회
   */
  async getSymbolsByExchange(exchangeId: string): Promise<string[]> {
    this.logger.log(`[SYMBOL SERVICE] getSymbolsByExchange called for ${exchangeId}`);
    
    const exchangeSymbols = await this.exchangeSymbolRepo.find({
      where: {
        exchangeId: exchangeId,
        isActive: true,
      },
      relations: ['symbol'],
    });

    this.logger.log(`[SYMBOL SERVICE] Found ${exchangeSymbols.length} active exchange symbols for ${exchangeId}`);
    
    const result = exchangeSymbols
      .filter((es) => es.symbol.isActive)
      .map((es) => es.symbol.symbol)
      .sort();
    
    this.logger.log(`[SYMBOL SERVICE] Returning ${result.length} active symbols for ${exchangeId}`);
    
    return result;
  }

  /**
   * 여러 거래소에서 공통으로 지원하는 심볼 목록 조회
   */
  async getCommonSymbols(exchangeIds: string[]): Promise<string[]> {
    if (exchangeIds.length === 0) return [];

    // 각 거래소의 심볼 목록 가져오기
    const symbolSets = await Promise.all(
      exchangeIds.map((exId) => this.getSymbolsByExchange(exId)),
    );

    if (symbolSets.length === 0) return [];

    // 교집합 찾기
    const commonSymbols = symbolSets[0].filter((symbol) =>
      symbolSets.every((set) => set.includes(symbol)),
    );

    return commonSymbols.sort();
  }

  /**
   * 바이낸스 기준 심볼명에 대한 거래소별 실제 심볼명 조회
   * @param exchangeId 거래소 ID
   * @param symbol 바이낸스 기준 심볼명
   * @returns 거래소에서 실제 사용하는 심볼명 (없으면 null)
   */
  async getExchangeSymbolName(exchangeId: string, symbol: string): Promise<string | null> {
    this.logger.debug(`[SYMBOL SERVICE] getExchangeSymbolName called: exchangeId=${exchangeId}, symbol=${symbol}`);
    
    // 먼저 symbols 테이블에서 심볼 찾기
    const dbSymbol = await this.symbolRepo.findOne({
      where: { symbol: symbol.toUpperCase(), isActive: true },
    });

    if (!dbSymbol) {
      this.logger.debug(`[SYMBOL SERVICE] Symbol not found in DB: ${symbol}`);
      return null;
    }

    // exchange_symbols 테이블에서 매핑 찾기
    const exchangeSymbol = await this.exchangeSymbolRepo.findOne({
      where: {
        symbolId: dbSymbol.id,
        exchangeId: exchangeId,
        isActive: true,
      },
    });

    if (!exchangeSymbol) {
      this.logger.debug(`[SYMBOL SERVICE] Exchange symbol mapping not found: ${symbol} on ${exchangeId}`);
      return null;
    }

    this.logger.debug(`[SYMBOL SERVICE] Found exchange symbol: ${symbol} -> ${exchangeSymbol.exchangeSymbol} on ${exchangeId}`);
    return exchangeSymbol.exchangeSymbol;
  }

  /**
   * 여러 거래소의 합집합 심볼 목록 조회
   */
  async getUnionSymbols(exchangeIds: string[]): Promise<string[]> {
    this.logger.log(`[SYMBOL SERVICE] getUnionSymbols called for exchanges: ${JSON.stringify(exchangeIds)}`);
    
    if (exchangeIds.length === 0) {
      this.logger.warn('[SYMBOL SERVICE] No exchanges provided, returning empty array');
      return [];
    }

    const symbolSets = await Promise.all(
      exchangeIds.map((exId) => this.getSymbolsByExchange(exId)),
    );

    this.logger.log(`[SYMBOL SERVICE] Got symbol sets: ${symbolSets.map((s, i) => `${exchangeIds[i]}:${s.length}`).join(', ')}`);

    const unionSet = new Set<string>();
    for (const set of symbolSets) {
      for (const symbol of set) {
        unionSet.add(symbol);
      }
    }

    const result = Array.from(unionSet).sort();
    this.logger.log(`[SYMBOL SERVICE] Returning ${result.length} union symbols`);
    
    return result;
  }
}

