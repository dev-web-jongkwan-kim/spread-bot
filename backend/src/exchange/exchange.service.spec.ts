import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExchangeService } from './exchange.service';
import { ConfigService } from '../config/config.service';
import { CacheService } from '../cache/cache.service';
import { Symbol } from '../database/entities/symbol.entity';
import { ExchangeSymbol } from '../database/entities/exchange-symbol.entity';

describe('ExchangeService', () => {
  let service: ExchangeService;
  let configService: ConfigService;

  const mockConfigService = {
    maxConcurrentExchanges: 8,
    priceCacheTtlSeconds: 5,
    priceUpdateIntervalSeconds: 10,
    alertCooldownSeconds: 300,
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockSymbolRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockExchangeSymbolRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: getRepositoryToken(Symbol),
          useValue: mockSymbolRepo,
        },
        {
          provide: getRepositoryToken(ExchangeSymbol),
          useValue: mockExchangeSymbolRepo,
        },
      ],
    }).compile();

    service = module.get<ExchangeService>(ExchangeService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getExchange', () => {
    it('should return undefined for uninitialized exchange', () => {
      const exchange = service.getExchange('binance');
      expect(exchange).toBeUndefined();
    });

    it('should return undefined for unsupported exchange', () => {
      const exchange = service.getExchange('unsupported');
      expect(exchange).toBeUndefined();
    });
  });

  describe('calculateSpread', () => {
    // Note: calculateSpread requires initialized CCXT exchanges and network calls
    // These tests are skipped as they would require integration testing setup
    // The actual signature is: calculateSpread(symbol: string, exchangeIds: string[])

    it.skip('should calculate spread percentage correctly (requires CCXT)', async () => {
      // Would need to mock fetchPricesForSymbol and CCXT exchanges
    });

    it.skip('should return null for insufficient price data (requires CCXT)', async () => {
      // Would need to mock fetchPricesForSymbol to return empty results
    });
  });
});
