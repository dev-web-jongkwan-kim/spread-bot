import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import ccxt from 'ccxt';
import { CacheService } from '../cache/cache.service';
import { ConfigService } from '../config/config.service';
import { SUPPORTED_EXCHANGES, QUOTE_CURRENCY } from '../common/constants';
import { Symbol } from '../database/entities/symbol.entity';
import { ExchangeSymbol } from '../database/entities/exchange-symbol.entity';
import Decimal from 'decimal.js';
import { circuitBreakerManager } from '../common/circuit-breaker';

export interface TickerPrice {
  exchange: string;
  symbol: string;
  price: number;
  volume24h: number;
  change24hPercent: number;
  timestamp: Date;
}

export interface SpreadResult {
  symbol: string;
  spreadPercent: number;
  buyExchange: string;
  buyPrice: number;
  sellExchange: string;
  sellPrice: number;
  potentialProfitPerUnit: number;
  timestamp: Date;
}

export interface PriceComparison {
  symbol: string;
  prices: Record<string, number>;
  minPrice: number;
  maxPrice: number;
  minExchange: string;
  maxExchange: string;
  spreadPercent: number;
  spreadAmount: number;
  timestamp: Date;
}

@Injectable()
export class ExchangeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExchangeService.name);
  private exchanges: Map<string, ccxt.Exchange> = new Map();
  private initialized = false;

  constructor(
    private readonly cache: CacheService,
    private readonly config: ConfigService,
    @InjectRepository(Symbol)
    private readonly symbolRepo: Repository<Symbol>,
    @InjectRepository(ExchangeSymbol)
    private readonly exchangeSymbolRepo: Repository<ExchangeSymbol>,
  ) {}

  async onModuleInit() {
    await this.initialize();
  }

  async initialize() {
    if (this.initialized) return;

    this.logger.log(`[EXCHANGE SERVICE] Initializing exchanges...`);
    
    for (const [exchangeId] of Object.entries(SUPPORTED_EXCHANGES)) {
      try {
        this.logger.log(`[EXCHANGE SERVICE] Attempting to initialize: ${exchangeId}`);
        
        // CCXT에서 거래소 클래스 찾기
        const ExchangeClass = ccxt[exchangeId as keyof typeof ccxt] as any;
        if (!ExchangeClass) {
          this.logger.warn(`[EXCHANGE SERVICE] Exchange class not found: ${exchangeId}`);
          this.logger.warn(`[EXCHANGE SERVICE] Available CCXT exchanges (sample): ${Object.keys(ccxt).slice(0, 10).join(', ')}`);
          continue;
        }

        this.logger.log(`[EXCHANGE SERVICE] Creating exchange instance for: ${exchangeId}`);
        const exchange = new ExchangeClass({
          enableRateLimit: true,
          timeout: 30000, // 타임아웃 증가 (30초)
        });

        this.exchanges.set(exchangeId, exchange);
        this.logger.log(`[EXCHANGE SERVICE] Successfully initialized exchange: ${exchangeId}`);
      } catch (error) {
        this.logger.error(`[EXCHANGE SERVICE] Failed to initialize ${exchangeId}: ${error}`);
        if (error instanceof Error) {
          this.logger.error(`[EXCHANGE SERVICE] Error message: ${error.message}`);
          this.logger.error(`[EXCHANGE SERVICE] Error stack: ${error.stack}`);
        }
      }
    }

    this.logger.log(`[EXCHANGE SERVICE] Initialization complete. Total exchanges: ${this.exchanges.size}`);
    this.logger.log(`[EXCHANGE SERVICE] Initialized exchanges: ${Array.from(this.exchanges.keys()).join(', ')}`);
    
    this.initialized = true;
  }

  async onModuleDestroy() {
    for (const exchange of this.exchanges.values()) {
      try {
        await exchange.close();
      } catch (error) {
        this.logger.error(`Error closing exchange: ${error.message}`);
      }
    }
    this.exchanges.clear();
  }

  getExchange(exchangeId: string): ccxt.Exchange | undefined {
    return this.exchanges.get(exchangeId);
  }

  async getSymbols(exchangeId: string): Promise<string[]> {
    this.logger.log(`[EXCHANGE SERVICE] getSymbols called for ${exchangeId}`);
    
    const exchange = this.getExchange(exchangeId);
    if (!exchange) {
      this.logger.warn(`[EXCHANGE SERVICE] Exchange not found: ${exchangeId}`);
      this.logger.warn(`[EXCHANGE SERVICE] Available exchanges: ${Array.from(this.exchanges.keys()).join(', ')}`);
      return [];
    }

    try {
      this.logger.log(`[EXCHANGE SERVICE] Loading markets for ${exchangeId}...`);
      
      // Load markets to get all available symbols
      await exchange.loadMarkets();
      
      const totalMarkets = Object.keys(exchange.markets || {}).length;
      this.logger.log(`[EXCHANGE SERVICE] Loaded ${totalMarkets} total markets from ${exchangeId}`);
      
      if (totalMarkets === 0) {
        this.logger.warn(`[EXCHANGE SERVICE] WARNING: No markets loaded from ${exchangeId}!`);
        this.logger.warn(`[EXCHANGE SERVICE] Exchange markets object: ${JSON.stringify(exchange.markets).substring(0, 200)}`);
        return [];
      }
      
      // Extract base currencies from markets (e.g., BTC from BTC/USDT)
      const symbols = new Set<string>();
      const quoteCurrency = QUOTE_CURRENCY;
      
      this.logger.log(`[EXCHANGE SERVICE] Filtering symbols with quote currency: ${quoteCurrency}`);
      
      let matchedCount = 0;
      let activeCount = 0;
      let inactiveCount = 0;
      
      for (const [marketId, market] of Object.entries(exchange.markets)) {
        const m = market as ccxt.Market;
        
        if (m.quote === quoteCurrency) {
          matchedCount++;
          if (m.active !== false) {
            symbols.add(m.base);
            activeCount++;
          } else {
            inactiveCount++;
          }
        }
      }
      
      this.logger.log(`[EXCHANGE SERVICE] ${exchangeId} symbol extraction:`);
      this.logger.log(`[EXCHANGE SERVICE]   - Total markets: ${totalMarkets}`);
      this.logger.log(`[EXCHANGE SERVICE]   - Markets with quote ${quoteCurrency}: ${matchedCount}`);
      this.logger.log(`[EXCHANGE SERVICE]   - Active symbols: ${activeCount}`);
      this.logger.log(`[EXCHANGE SERVICE]   - Inactive symbols: ${inactiveCount}`);
      this.logger.log(`[EXCHANGE SERVICE]   - Final symbol count: ${symbols.size}`);
      
      if (symbols.size === 0 && matchedCount > 0) {
        this.logger.warn(`[EXCHANGE SERVICE] WARNING: Found ${matchedCount} markets but all are inactive!`);
      }
      
      if (symbols.size === 0 && matchedCount === 0) {
        this.logger.warn(`[EXCHANGE SERVICE] WARNING: No markets found with quote currency ${quoteCurrency}!`);
        this.logger.warn(`[EXCHANGE SERVICE] Sample market IDs: ${Object.keys(exchange.markets).slice(0, 10).join(', ')}`);
        // 샘플 마켓 정보 출력
        const sampleMarkets = Object.entries(exchange.markets).slice(0, 5);
        for (const [id, m] of sampleMarkets) {
          const market = m as ccxt.Market;
          this.logger.warn(`[EXCHANGE SERVICE]   Sample: ${id} -> base: ${market.base}, quote: ${market.quote}, active: ${market.active}`);
        }
      }
      
      const result = Array.from(symbols).sort();
      this.logger.log(`[EXCHANGE SERVICE] Returning ${result.length} symbols from ${exchangeId}`);
      
      return result;
    } catch (error) {
      this.logger.error(`[EXCHANGE SERVICE] Failed to load symbols from ${exchangeId}: ${error}`);
      if (error instanceof Error) {
        this.logger.error(`[EXCHANGE SERVICE] Error message: ${error.message}`);
        this.logger.error(`[EXCHANGE SERVICE] Error stack: ${error.stack}`);
      }
      return [];
    }
  }

  /**
   * 거래소에서 마켓 정보를 가져와서 base 심볼과 실제 거래소 심볼명 매핑 반환
   * @param exchangeId 거래소 ID
   * @returns base 심볼명 -> 거래소 실제 심볼명 매핑 (예: { "BTC": "BTC", "USELESS": "USELESS" })
   */
  async getSymbolMapping(exchangeId: string): Promise<Map<string, string>> {
    this.logger.log(`[EXCHANGE SERVICE] getSymbolMapping called for ${exchangeId}`);
    
    const exchange = this.getExchange(exchangeId);
    if (!exchange) {
      this.logger.warn(`[EXCHANGE SERVICE] Exchange not found for mapping: ${exchangeId}`);
      return new Map();
    }

    try {
      await exchange.loadMarkets();
      
      const mapping = new Map<string, string>();
      const quoteCurrency = QUOTE_CURRENCY;
      
      for (const [marketId, market] of Object.entries(exchange.markets)) {
        const m = market as ccxt.Market;
        
        if (m.quote === quoteCurrency && m.active !== false) {
          // base 심볼명을 키로 사용 (바이낸스 기준 심볼명)
          const baseSymbol = m.base;
          
          // 실제 거래소에서 사용하는 심볼명 추출
          // CCXT의 market.id는 원본 거래소 심볼명 (예: "1000RATSUSDT")
          // market.symbol은 정규화된 형식 (예: "1000RATS/USDT")
          // market.base는 base 심볼 (예: "1000RATS")
          // 
          // 바이낸스의 경우:
          // - market.id: "1000RATSUSDT" (원본)
          // - market.symbol: "1000RATS/USDT" (정규화)
          // - market.base: "1000RATS" (base 심볼)
          //
          // fetchTicker 호출 시에는 "1000RATS/USDT" 형식을 사용하므로
          // exchangeSymbol에는 base 심볼을 저장 (CCXT가 자동으로 /USDT 추가)
          // 하지만 로깅을 위해 원본 심볼명도 확인
          const exchangeSymbol = m.base; // CCXT가 자동으로 /USDT 추가하여 사용
          
          // 디버깅: 특정 심볼 상세 로깅 (1000RATS 등)
          const baseUpper = baseSymbol.toUpperCase();
          if (baseUpper.includes('1000') || baseUpper.includes('RATS')) {
            const marketInfo = {
              marketId,
              base: m.base,
              quote: m.quote,
              symbol: m.symbol,
              id: (m as any).id || marketId,
              active: m.active,
              info: (m as any).info || {},
            };
            this.logger.log(`[EXCHANGE SERVICE] ==========================================`);
            this.logger.log(`[EXCHANGE SERVICE] Symbol mapping detail for ${baseSymbol}:`);
            this.logger.log(`[EXCHANGE SERVICE]   marketId: ${marketId}`);
            this.logger.log(`[EXCHANGE SERVICE]   base: ${m.base}`);
            this.logger.log(`[EXCHANGE SERVICE]   quote: ${m.quote}`);
            this.logger.log(`[EXCHANGE SERVICE]   symbol: ${m.symbol}`);
            this.logger.log(`[EXCHANGE SERVICE]   id: ${(m as any).id || marketId}`);
            this.logger.log(`[EXCHANGE SERVICE]   active: ${m.active}`);
            this.logger.log(`[EXCHANGE SERVICE]   Mapping: ${baseSymbol} -> ${exchangeSymbol}`);
            this.logger.log(`[EXCHANGE SERVICE] ==========================================`);
          }
          
          // 이미 매핑이 있으면 유지 (첫 번째 발견된 것이 우선)
          if (!mapping.has(baseSymbol)) {
            mapping.set(baseSymbol, exchangeSymbol);
          }
        }
      }
      
      this.logger.log(`[EXCHANGE SERVICE] Created mapping for ${exchangeId}: ${mapping.size} symbols`);
      
      return mapping;
    } catch (error) {
      this.logger.error(`[EXCHANGE SERVICE] Failed to get symbol mapping from ${exchangeId}: ${error}`);
      if (error instanceof Error) {
        this.logger.error(`[EXCHANGE SERVICE] Error message: ${error.message}`);
      }
      return new Map();
    }
  }

  async getAllSymbols(exchangeIds: string[]): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};
    
    for (const exchangeId of exchangeIds) {
      result[exchangeId] = await this.getSymbols(exchangeId);
    }
    
    return result;
  }

  async getCommonSymbols(exchangeIds: string[]): Promise<string[]> {
    if (exchangeIds.length === 0) return [];
    
    const allSymbols = await this.getAllSymbols(exchangeIds);
    const symbolSets = Object.values(allSymbols).map(symbols => new Set(symbols));
    
    // Find symbols that exist in all exchanges
    const commonSymbols = symbolSets[0] || new Set();
    for (let i = 1; i < symbolSets.length; i++) {
      for (const symbol of commonSymbols) {
        if (!symbolSets[i].has(symbol)) {
          commonSymbols.delete(symbol);
        }
      }
    }
    
    return Array.from(commonSymbols).sort();
  }

  async getUnionSymbols(exchangeIds: string[]): Promise<string[]> {
    if (exchangeIds.length === 0) return [];
    
    const allSymbols = await this.getAllSymbols(exchangeIds);
    const unionSet = new Set<string>();
    
    for (const symbols of Object.values(allSymbols)) {
      for (const symbol of symbols) {
        unionSet.add(symbol);
      }
    }
    
    return Array.from(unionSet).sort();
  }

  async isSymbolSupported(exchangeId: string, symbol: string): Promise<boolean> {
    this.logger.debug(`[EXCHANGE SERVICE] isSymbolSupported called: exchangeId=${exchangeId}, symbol=${symbol}`);
    
    // 먼저 DB의 exchange_symbols 테이블에서 확인
    try {
      const dbSymbol = await this.symbolRepo.findOne({
        where: { symbol: symbol.toUpperCase(), isActive: true },
      });

      if (dbSymbol) {
        const exchangeSymbol = await this.exchangeSymbolRepo.findOne({
          where: {
            symbolId: dbSymbol.id,
            exchangeId: exchangeId,
            isActive: true,
          },
        });

        if (exchangeSymbol) {
          this.logger.debug(`[EXCHANGE SERVICE] Found exchange symbol mapping: ${symbol} -> ${exchangeSymbol.exchangeSymbol} on ${exchangeId}`);
          return true;
        }
      }
    } catch (error) {
      this.logger.warn(`[EXCHANGE SERVICE] Failed to check exchange_symbols table: ${error}`);
    }
    
    // DB에 없으면 직접 거래소 API 확인 (fallback)
    const exchange = this.getExchange(exchangeId);
    if (!exchange) {
      this.logger.debug(`[EXCHANGE SERVICE] Exchange not found: ${exchangeId}`);
      return false;
    }

    try {
      await exchange.loadMarkets();
      const tradingPair = `${symbol}/${QUOTE_CURRENCY}`;
      const market = exchange.markets[tradingPair];
      const supported = market !== undefined && market.active !== false;
      this.logger.debug(`[EXCHANGE SERVICE] Direct API check: ${symbol} on ${exchangeId} = ${supported}`);
      return supported;
    } catch (error) {
      this.logger.debug(`[EXCHANGE SERVICE] Error checking symbol support: ${error}`);
      return false;
    }
  }

  async fetchTicker(
    exchangeId: string,
    symbol: string,
  ): Promise<TickerPrice | null> {
    this.logger.debug(`[EXCHANGE SERVICE] fetchTicker called: exchangeId=${exchangeId}, symbol=${symbol}`);
    
    // Check cache (바이낸스 심볼명으로 캐시 키 사용)
    const cached = await this.cache.getPrice(exchangeId, symbol);
    if (cached) {
      this.logger.debug(`[EXCHANGE SERVICE] Cache hit for ${exchangeId}/${symbol}`);
      return {
        ...cached,
        timestamp: new Date(cached.timestamp),
      };
    }

    const exchange = this.getExchange(exchangeId);
    if (!exchange) {
      this.logger.warn(`[EXCHANGE SERVICE] Exchange not found: ${exchangeId}`);
      return null;
    }

    try {
      // DB에서 거래소별 실제 심볼명 조회
      let exchangeSymbolName = symbol; // 기본값은 바이낸스 심볼명
      try {
        const dbSymbol = await this.symbolRepo.findOne({
          where: { symbol: symbol.toUpperCase(), isActive: true },
        });

        if (dbSymbol) {
          const exchangeSymbol = await this.exchangeSymbolRepo.findOne({
            where: {
              symbolId: dbSymbol.id,
              exchangeId: exchangeId,
              isActive: true,
            },
          });

          if (exchangeSymbol) {
            exchangeSymbolName = exchangeSymbol.exchangeSymbol;
            this.logger.debug(`[EXCHANGE SERVICE] Using exchange symbol name: ${symbol} -> ${exchangeSymbolName} on ${exchangeId}`);
          } else {
            this.logger.debug(`[EXCHANGE SERVICE] No exchange symbol mapping found, using original: ${symbol}`);
          }
        } else {
          this.logger.debug(`[EXCHANGE SERVICE] Symbol not found in DB, using original: ${symbol}`);
        }
      } catch (error) {
        this.logger.warn(`[EXCHANGE SERVICE] Failed to get exchange symbol name, using original: ${error}`);
      }

      // CCXT는 "SYMBOL/QUOTE" 형식을 사용 (예: "1000RATS/USDT")
      // CCXT가 내부적으로 거래소별 형식으로 변환 (예: "1000RATSUSDT")
      // CCXT는 "SYMBOL/QUOTE" 형식을 사용 (예: "1000RATS/USDT")
      // 하지만 일부 거래소(특히 바이낸스)에서는 특수 심볼이 제대로 변환되지 않을 수 있음
      // 
      // 바이낸스의 경우:
      // - CCXT 형식: "1000RATS/USDT" → 실패할 수 있음
      // - 바이낸스 원본: "1000RATSUSDT" → 성공
      //
      // 해결: 먼저 CCXT 형식으로 시도하고, 실패하면 거래소별 원본 형식으로 재시도
      const tradingPair = `${exchangeSymbolName}/${QUOTE_CURRENCY}`;
      this.logger.debug(`[EXCHANGE SERVICE] Fetching ticker for ${tradingPair} on ${exchangeId}`);
      this.logger.debug(`[EXCHANGE SERVICE]   Original symbol: ${symbol}`);
      this.logger.debug(`[EXCHANGE SERVICE]   Exchange symbol name: ${exchangeSymbolName}`);
      
      // 1000RATS 같은 특수 심볼에 대한 상세 로깅
      const isSpecialSymbol = symbol.toUpperCase().includes('1000') || symbol.toUpperCase().includes('RATS');
      if (isSpecialSymbol) {
        this.logger.log(`[EXCHANGE SERVICE] ==========================================`);
        this.logger.log(`[EXCHANGE SERVICE] Fetching ticker for special symbol: ${symbol}`);
        this.logger.log(`[EXCHANGE SERVICE]   Trading pair: ${tradingPair}`);
        this.logger.log(`[EXCHANGE SERVICE]   Exchange: ${exchangeId}`);
        this.logger.log(`[EXCHANGE SERVICE] ==========================================`);
      }
      
      let ticker;
      try {
        // Use circuit breaker for external API calls
        const breaker = circuitBreakerManager.getBreaker(exchangeId);
        ticker = await breaker.execute(async () => {
          // 먼저 CCXT 표준 형식으로 시도
          return await exchange.fetchTicker(tradingPair);
        });
        if (isSpecialSymbol) {
          this.logger.log(`[EXCHANGE SERVICE] Successfully fetched ticker for ${symbol}: $${ticker.last}`);
        }
      } catch (error) {
        // CCXT 형식이 실패한 경우, 거래소별 원본 형식으로 재시도
        if (error instanceof ccxt.BadSymbol || error instanceof ccxt.ExchangeError) {
          this.logger.warn(`[EXCHANGE SERVICE] CCXT format failed, trying exchange-specific format...`);
          
          // 거래소별 원본 형식 생성
          let alternativePair: string;
          switch (exchangeId) {
            case 'binance':
            case 'bybit':
              // 바이낸스/바이빗: "1000RATSUSDT" 형식
              alternativePair = `${exchangeSymbolName}${QUOTE_CURRENCY}`;
              break;
            case 'coinbase':
              // 코인베이스: "1000RATS-USDT" 형식
              alternativePair = `${exchangeSymbolName}-${QUOTE_CURRENCY}`;
              break;
            case 'kucoin':
            case 'huobi':
              // KuCoin/Huobi: "1000RATS-USDT" 형식
              alternativePair = `${exchangeSymbolName}-${QUOTE_CURRENCY}`;
              break;
            case 'gateio':
              // Gate.io: "1000RATS_USDT" 형식
              alternativePair = `${exchangeSymbolName}_${QUOTE_CURRENCY}`;
              break;
            default:
              // 기본값: CCXT 형식 유지
              alternativePair = tradingPair;
          }
          
          if (alternativePair !== tradingPair) {
            this.logger.warn(`[EXCHANGE SERVICE] Trying alternative format for ${exchangeId}: ${alternativePair}`);
            try {
              ticker = await exchange.fetchTicker(alternativePair);
              this.logger.debug(`[EXCHANGE SERVICE] Success with alternative format: ${alternativePair}`);
              if (isSpecialSymbol) {
                this.logger.log(`[EXCHANGE SERVICE] Successfully fetched ticker for ${symbol} using alternative format: $${ticker.last}`);
              }
            } catch (retryError) {
              this.logger.error(`[EXCHANGE SERVICE] Alternative format also failed: ${alternativePair}`);
              throw error; // 원본 에러 throw
            }
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      const result: TickerPrice = {
        exchange: exchangeId,
        symbol, // 바이낸스 기준 심볼명 유지 (일관성)
        price: parseFloat(ticker.last?.toString() || '0'),
        volume24h: parseFloat(ticker.quoteVolume?.toString() || '0'),
        change24hPercent: parseFloat(ticker.percentage?.toString() || '0'),
        timestamp: new Date(),
      };

      // Cache result (바이낸스 심볼명으로 캐시)
      await this.cache.setPrice(exchangeId, symbol, result);

      this.logger.debug(`[EXCHANGE SERVICE] Successfully fetched ticker for ${symbol} on ${exchangeId}: $${result.price}`);
      return result;
    } catch (error) {
      if (error instanceof ccxt.NetworkError) {
        this.logger.warn(`[EXCHANGE SERVICE] Network error on ${exchangeId} for ${symbol}: ${error.message}`);
      } else if (error instanceof ccxt.ExchangeError) {
        this.logger.debug(`[EXCHANGE SERVICE] Exchange error on ${exchangeId} for ${symbol}: ${error.message}`);
      } else {
        this.logger.error(`[EXCHANGE SERVICE] Unexpected error on ${exchangeId} for ${symbol}: ${error.message}`);
      }
      return null;
    }
  }

  async fetchPricesForSymbol(
    symbol: string,
    exchangeIds: string[],
  ): Promise<Record<string, number>> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'exchange.service.ts:fetchPricesForSymbol',message:'Fetching prices',data:{symbol,exchangeIds},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'V'})}).catch(()=>{});
    // #endregion
    
    const tasks = exchangeIds.map((exchangeId) =>
      this.fetchTicker(exchangeId, symbol),
    );

    const results = await Promise.allSettled(tasks);

    const prices: Record<string, number> = {};
    for (let i = 0; i < exchangeIds.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        prices[exchangeIds[i]] = result.value.price;
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'exchange.service.ts:fetchPricesForSymbol',message:'Prices fetched',data:{symbol,prices,priceCount:Object.keys(prices).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'W'})}).catch(()=>{});
    // #endregion

    return prices;
  }

  async calculateSpread(
    symbol: string,
    exchangeIds: string[],
  ): Promise<SpreadResult | null> {
    const prices = await this.fetchPricesForSymbol(symbol, exchangeIds);

    if (Object.keys(prices).length < 2) {
      this.logger.debug(`Insufficient price data for ${symbol}: ${Object.keys(prices).length} exchanges`);
      return null;
    }

    const priceEntries = Object.entries(prices);
    const minEntry = priceEntries.reduce((a, b) => (a[1] < b[1] ? a : b));
    const maxEntry = priceEntries.reduce((a, b) => (a[1] > b[1] ? a : b));

    const minPrice = new Decimal(minEntry[1]);
    const maxPrice = new Decimal(maxEntry[1]);
    const spreadPercent = maxPrice.minus(minPrice).div(minPrice).times(100).toNumber();

    return {
      symbol,
      spreadPercent,
      buyExchange: minEntry[0],
      buyPrice: minPrice.toNumber(),
      sellExchange: maxEntry[0],
      sellPrice: maxPrice.toNumber(),
      potentialProfitPerUnit: maxPrice.minus(minPrice).toNumber(),
      timestamp: new Date(),
    };
  }

  async getPriceComparison(
    symbol: string,
    exchangeIds: string[],
  ): Promise<PriceComparison | null> {
    const prices = await this.fetchPricesForSymbol(symbol, exchangeIds);

    if (Object.keys(prices).length === 0) {
      return null;
    }

    if (Object.keys(prices).length === 1) {
      const [exchange, price] = Object.entries(prices)[0];
      return {
        symbol,
        prices,
        minPrice: price,
        maxPrice: price,
        minExchange: exchange,
        maxExchange: exchange,
        spreadPercent: 0,
        spreadAmount: 0,
        timestamp: new Date(),
      };
    }

    const priceEntries = Object.entries(prices);
    const minEntry = priceEntries.reduce((a, b) => (a[1] < b[1] ? a : b));
    const maxEntry = priceEntries.reduce((a, b) => (a[1] > b[1] ? a : b));

    const minPrice = new Decimal(minEntry[1]);
    const maxPrice = new Decimal(maxEntry[1]);
    const spreadPercent = maxPrice.minus(minPrice).div(minPrice).times(100).toNumber();
    const spreadAmount = maxPrice.minus(minPrice).toNumber();

    return {
      symbol,
      prices,
      minPrice: minPrice.toNumber(),
      maxPrice: maxPrice.toNumber(),
      minExchange: minEntry[0],
      maxExchange: maxEntry[0],
      spreadPercent,
      spreadAmount,
      timestamp: new Date(),
    };
  }
}



