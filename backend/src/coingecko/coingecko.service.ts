import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnifiedSymbol } from '../database/entities/unified-symbol.entity';
import { UnifiedSymbolExchange } from '../database/entities/unified-symbol-exchange.entity';

interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
}

interface CoinGeckoTicker {
  base: string;
  target: string;
  market: {
    identifier: string;
    name: string;
  };
  last: number;
  volume: number;
  converted_last: {
    usd: number;
  };
}

interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank: number;
  tickers: CoinGeckoTicker[];
}

@Injectable()
export class CoinGeckoService {
  private readonly logger = new Logger(CoinGeckoService.name);
  private readonly API_BASE = 'https://api.coingecko.com/api/v3';
  private readonly RATE_LIMIT_DELAY = 1500; // 1.5 seconds between requests
  
  // Exchange ID mapping (CoinGecko identifier -> our identifier)
  private readonly EXCHANGE_MAP: Record<string, string> = {
    binance: 'binance',
    coinbase: 'coinbase',
    kraken: 'kraken',
    okex: 'okx',
    okx: 'okx',
    bybit_spot: 'bybit',
    bybit: 'bybit',
    kucoin: 'kucoin',
    gate: 'gateio',
    gateio: 'gateio',
    huobi: 'huobi',
    htx: 'huobi',
  };

  constructor(
    @InjectRepository(UnifiedSymbol)
    private readonly unifiedSymbolRepo: Repository<UnifiedSymbol>,
    @InjectRepository(UnifiedSymbolExchange)
    private readonly unifiedExchangeRepo: Repository<UnifiedSymbolExchange>,
  ) {}

  /**
   * Fetch all coins list from CoinGecko (basic info)
   */
  async fetchCoinsList(): Promise<CoinGeckoCoin[]> {
    try {
      this.logger.log('[COINGECKO] Fetching coins list...');
      const response = await fetch(`${this.API_BASE}/coins/list`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const coins: CoinGeckoCoin[] = await response.json();
      this.logger.log(`[COINGECKO] Fetched ${coins.length} coins`);
      return coins;
    } catch (error) {
      this.logger.error(`[COINGECKO] Failed to fetch coins list: ${error}`);
      throw error;
    }
  }

  /**
   * Fetch coin details including tickers from CoinGecko
   */
  async fetchCoinTickers(coinId: string): Promise<CoinGeckoMarketData | null> {
    try {
      const response = await fetch(
        `${this.API_BASE}/coins/${coinId}?tickers=true&market_data=false&community_data=false&developer_data=false`,
      );
      
      if (!response.ok) {
        if (response.status === 429) {
          this.logger.warn(`[COINGECKO] Rate limited, waiting...`);
          await this.delay(60000); // Wait 1 minute
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      this.logger.error(`[COINGECKO] Failed to fetch tickers for ${coinId}: ${error}`);
      return null;
    }
  }

  /**
   * Sync exchange mappings for a specific unified symbol
   */
  async syncExchangeMappings(unifiedSymbol: UnifiedSymbol): Promise<number> {
    if (!unifiedSymbol.coingeckoId) {
      return 0;
    }

    await this.delay(this.RATE_LIMIT_DELAY);
    
    const coinData = await this.fetchCoinTickers(unifiedSymbol.coingeckoId);
    if (!coinData || !coinData.tickers) {
      return 0;
    }

    let mappedCount = 0;

    for (const ticker of coinData.tickers) {
      // Only USDT pairs
      if (ticker.target !== 'USDT') continue;

      const exchangeId = this.EXCHANGE_MAP[ticker.market.identifier.toLowerCase()];
      if (!exchangeId) continue;

      try {
        // Check if mapping exists
        let mapping = await this.unifiedExchangeRepo.findOne({
          where: {
            unifiedSymbolId: unifiedSymbol.id,
            exchangeId: exchangeId,
          },
        });

        // Calculate multiplier based on symbol prefix (1000, 10000, etc.)
        const multiplier = this.calculateMultiplier(
          ticker.base,
          unifiedSymbol.standardSymbol,
        );

        if (mapping) {
          // Update existing mapping
          mapping.exchangeSymbol = ticker.base;
          mapping.multiplier = multiplier;
          mapping.isActive = true;
          mapping.lastVerifiedAt = new Date();
          await this.unifiedExchangeRepo.save(mapping);
        } else {
          // Create new mapping
          mapping = this.unifiedExchangeRepo.create({
            unifiedSymbolId: unifiedSymbol.id,
            exchangeId: exchangeId,
            exchangeSymbol: ticker.base,
            tradingPair: `${ticker.base}${ticker.target}`,
            multiplier: multiplier,
            isActive: true,
            lastVerifiedAt: new Date(),
          });
          await this.unifiedExchangeRepo.save(mapping);
        }

        mappedCount++;
      } catch (error) {
        this.logger.error(
          `[COINGECKO] Failed to save mapping for ${unifiedSymbol.standardSymbol} on ${exchangeId}: ${error}`,
        );
      }
    }

    return mappedCount;
  }

  /**
   * Calculate price multiplier based on symbol prefix
   * e.g., 1000SHIB -> SHIB = 1000x multiplier
   */
  calculateMultiplier(exchangeSymbol: string, standardSymbol: string): number {
    const upperExchange = exchangeSymbol.toUpperCase();
    const upperStandard = standardSymbol.toUpperCase();

    // Check for numeric prefix
    const match = upperExchange.match(/^(\d+)(.+)$/);
    if (match) {
      const prefix = parseInt(match[1]);
      const baseSymbol = match[2];

      if (baseSymbol === upperStandard) {
        return prefix; // e.g., 1000SHIB / SHIB = 1000
      }
    }

    // Check if standard symbol has numeric prefix
    const standardMatch = upperStandard.match(/^(\d+)(.+)$/);
    if (standardMatch) {
      const prefix = parseInt(standardMatch[1]);
      const baseSymbol = standardMatch[2];

      if (upperExchange === baseSymbol) {
        return 1 / prefix; // e.g., SHIB / 1000SHIB = 0.001
      }
    }

    return 1; // No multiplier
  }

  /**
   * Sync all unified symbols with CoinGecko data
   */
  async syncAllMappings(): Promise<{ total: number; mapped: number }> {
    this.logger.log('[COINGECKO] Starting full sync...');

    const unifiedSymbols = await this.unifiedSymbolRepo.find({
      where: { isActive: true },
      order: { marketCapRank: 'ASC' },
    });

    this.logger.log(`[COINGECKO] Found ${unifiedSymbols.length} unified symbols`);

    let totalMapped = 0;

    for (let i = 0; i < unifiedSymbols.length; i++) {
      const symbol = unifiedSymbols[i];

      if ((i + 1) % 10 === 0) {
        this.logger.log(
          `[COINGECKO] Progress: ${i + 1}/${unifiedSymbols.length} symbols...`,
        );
      }

      const mapped = await this.syncExchangeMappings(symbol);
      totalMapped += mapped;
    }

    this.logger.log(
      `[COINGECKO] Sync completed: ${totalMapped} mappings for ${unifiedSymbols.length} symbols`,
    );

    return { total: unifiedSymbols.length, mapped: totalMapped };
  }

  /**
   * Update CoinGecko IDs for unified symbols
   */
  async updateCoinGeckoIds(): Promise<number> {
    this.logger.log('[COINGECKO] Updating CoinGecko IDs...');

    const coins = await this.fetchCoinsList();
    
    // Create a map of symbol -> coingecko_id
    const symbolMap = new Map<string, string>();
    for (const coin of coins) {
      const key = coin.symbol.toUpperCase();
      // Prefer coins with shorter IDs (usually more popular)
      if (!symbolMap.has(key) || coin.id.length < symbolMap.get(key)!.length) {
        symbolMap.set(key, coin.id);
      }
    }

    // Update unified symbols
    const unifiedSymbols = await this.unifiedSymbolRepo.find({
      where: { coingeckoId: null as unknown as string },
    });

    let updated = 0;
    for (const symbol of unifiedSymbols) {
      const cgId = symbolMap.get(symbol.standardSymbol.toUpperCase());
      if (cgId) {
        symbol.coingeckoId = cgId;
        await this.unifiedSymbolRepo.save(symbol);
        updated++;
      }
    }

    this.logger.log(`[COINGECKO] Updated ${updated} CoinGecko IDs`);
    return updated;
  }

  /**
   * Get unified symbol with exchange mappings
   */
  async getUnifiedSymbol(standardSymbol: string): Promise<UnifiedSymbol | null> {
    return this.unifiedSymbolRepo.findOne({
      where: { standardSymbol: standardSymbol.toUpperCase(), isActive: true },
      relations: ['exchangeMappings'],
    });
  }

  /**
   * Get all unified symbols with their exchange mappings
   */
  async getAllUnifiedSymbols(): Promise<UnifiedSymbol[]> {
    return this.unifiedSymbolRepo.find({
      where: { isActive: true },
      relations: ['exchangeMappings'],
      order: { marketCapRank: 'ASC' },
    });
  }

  /**
   * Get exchange symbol for a unified symbol
   */
  async getExchangeSymbol(
    standardSymbol: string,
    exchangeId: string,
  ): Promise<{ symbol: string; multiplier: number } | null> {
    const mapping = await this.unifiedExchangeRepo
      .createQueryBuilder('use')
      .innerJoin('use.unifiedSymbol', 'us')
      .where('us.standard_symbol = :standardSymbol', {
        standardSymbol: standardSymbol.toUpperCase(),
      })
      .andWhere('use.exchange_id = :exchangeId', { exchangeId })
      .andWhere('use.is_active = true')
      .getOne();

    if (mapping) {
      return {
        symbol: mapping.exchangeSymbol,
        multiplier: Number(mapping.multiplier),
      };
    }

    return null;
  }

  /**
   * Normalize price based on multiplier
   * e.g., 1000SHIB price * 1000 = SHIB equivalent price
   */
  normalizePrice(price: number, multiplier: number): number {
    return price * multiplier;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

