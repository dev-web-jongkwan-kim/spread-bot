import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SymbolService } from './symbol.service';
import { Symbol } from '../database/entities/symbol.entity';
import { ExchangeSymbol } from '../database/entities/exchange-symbol.entity';
import { ExchangeService } from '../exchange/exchange.service';

describe('SymbolService', () => {
  let service: SymbolService;
  let symbolRepo: any;
  let exchangeSymbolRepo: any;
  let exchangeService: ExchangeService;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockSymbolRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockExchangeSymbolRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockExchangeService = {
    initialize: jest.fn(),
    getExchange: jest.fn(),
    getSymbols: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SymbolService,
        {
          provide: getRepositoryToken(Symbol),
          useValue: mockSymbolRepo,
        },
        {
          provide: getRepositoryToken(ExchangeSymbol),
          useValue: mockExchangeSymbolRepo,
        },
        {
          provide: ExchangeService,
          useValue: mockExchangeService,
        },
      ],
    }).compile();

    service = module.get<SymbolService>(SymbolService);
    symbolRepo = module.get(getRepositoryToken(Symbol));
    exchangeSymbolRepo = module.get(getRepositoryToken(ExchangeSymbol));
    exchangeService = module.get<ExchangeService>(ExchangeService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveSymbols', () => {
    it('should return all active symbols when no search term provided', async () => {
      const mockSymbols = [
        { id: '1', symbol: 'BTC', isActive: true },
        { id: '2', symbol: 'ETH', isActive: true },
        { id: '3', symbol: 'SOL', isActive: true },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockSymbols);

      const result = await service.getActiveSymbols();

      expect(result).toEqual(['BTC', 'ETH', 'SOL']);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'symbol.isActive = :isActive',
        { isActive: true },
      );
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should filter symbols by search term', async () => {
      const mockSymbols = [
        { id: '1', symbol: 'BTC', isActive: true },
        { id: '2', symbol: 'BTCUSDT', isActive: true },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockSymbols);

      const result = await service.getActiveSymbols('BTC');

      expect(result).toEqual(['BTC', 'BTCUSDT']);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'symbol.symbol ILIKE :search',
        { search: '%BTC%' },
      );
    });

    it('should handle case-insensitive search', async () => {
      const mockSymbols = [{ id: '1', symbol: 'ETH', isActive: true }];

      mockQueryBuilder.getMany.mockResolvedValue(mockSymbols);

      const result = await service.getActiveSymbols('eth');

      expect(result).toEqual(['ETH']);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'symbol.symbol ILIKE :search',
        { search: '%ETH%' },
      );
    });

    it('should return empty array when no symbols match', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.getActiveSymbols('NONEXISTENT');

      expect(result).toEqual([]);
    });

    it('should trim search term', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getActiveSymbols('  BTC  ');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'symbol.symbol ILIKE :search',
        { search: '%BTC%' },
      );
    });
  });

  describe('getSymbolAvailability', () => {
    it('should return availability for all symbols and exchanges', async () => {
      const mockDbSymbols = [
        {
          symbol: 'BTC',
          exchangeSymbols: [
            { exchangeId: 'binance', isActive: true },
            { exchangeId: 'coinbase', isActive: true },
          ],
        },
        {
          symbol: 'ETH',
          exchangeSymbols: [
            { exchangeId: 'binance', isActive: true },
            { exchangeId: 'coinbase', isActive: false },
          ],
        },
      ];

      mockSymbolRepo.find.mockResolvedValue(mockDbSymbols);

      const result = await service.getSymbolAvailability(
        ['BTC', 'ETH'],
        ['binance', 'coinbase', 'kraken'],
      );

      expect(result).toEqual({
        BTC: {
          binance: true,
          coinbase: true,
          kraken: false,
        },
        ETH: {
          binance: true,
          coinbase: false,
          kraken: false,
        },
      });
    });

    it('should return false for symbols not in database', async () => {
      mockSymbolRepo.find.mockResolvedValue([]);

      const result = await service.getSymbolAvailability(
        ['UNKNOWN'],
        ['binance'],
      );

      expect(result).toEqual({
        UNKNOWN: {
          binance: false,
        },
      });
    });

    it('should handle empty symbol array', async () => {
      const result = await service.getSymbolAvailability([], ['binance']);

      expect(result).toEqual({});
      expect(mockSymbolRepo.find).not.toHaveBeenCalled();
    });

    it('should handle multiple exchanges', async () => {
      const mockDbSymbols = [
        {
          symbol: 'BTC',
          exchangeSymbols: [
            { exchangeId: 'binance', isActive: true },
            { exchangeId: 'coinbase', isActive: true },
            { exchangeId: 'kraken', isActive: true },
          ],
        },
      ];

      mockSymbolRepo.find.mockResolvedValue(mockDbSymbols);

      const result = await service.getSymbolAvailability(
        ['BTC'],
        ['binance', 'coinbase', 'kraken', 'okx'],
      );

      expect(result.BTC).toEqual({
        binance: true,
        coinbase: true,
        kraken: true,
        okx: false,
      });
    });
  });

  describe('getSymbolsByExchange', () => {
    it('should return symbols for given exchange', async () => {
      const mockExchangeSymbols = [
        {
          exchangeId: 'binance',
          isActive: true,
          symbol: { symbol: 'BTC', isActive: true },
        },
        {
          exchangeId: 'binance',
          isActive: true,
          symbol: { symbol: 'ETH', isActive: true },
        },
        {
          exchangeId: 'binance',
          isActive: true,
          symbol: { symbol: 'SOL', isActive: true },
        },
      ];

      mockExchangeSymbolRepo.find.mockResolvedValue(mockExchangeSymbols);

      const result = await service.getSymbolsByExchange('binance');

      expect(result).toEqual(['BTC', 'ETH', 'SOL']);
      expect(mockExchangeSymbolRepo.find).toHaveBeenCalledWith({
        where: {
          exchangeId: 'binance',
          isActive: true,
        },
        relations: ['symbol'],
      });
    });

    it('should return empty array for exchange with no symbols', async () => {
      mockExchangeSymbolRepo.find.mockResolvedValue([]);

      const result = await service.getSymbolsByExchange('unknown');

      expect(result).toEqual([]);
    });

    it('should only return active symbols', async () => {
      const mockExchangeSymbols = [
        {
          exchangeId: 'coinbase',
          isActive: true,
          symbol: { symbol: 'BTC', isActive: true },
        },
        {
          exchangeId: 'coinbase',
          isActive: true,
          symbol: { symbol: 'OLD', isActive: false }, // inactive symbol should be filtered
        },
      ];

      mockExchangeSymbolRepo.find.mockResolvedValue(mockExchangeSymbols);

      const result = await service.getSymbolsByExchange('coinbase');

      expect(result).toEqual(['BTC']); // Only active symbols
      expect(mockExchangeSymbolRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });

  describe('syncSymbolsFromBinance', () => {
    it('should sync symbols from Binance', async () => {
      const mockBinanceSymbols = ['BTC', 'ETH', 'SOL'];

      mockExchangeService.initialize.mockResolvedValue(undefined);
      mockExchangeService.getExchange.mockReturnValue({ id: 'binance' });
      mockSymbolRepo.count.mockResolvedValue(0);
      mockExchangeService.getSymbols.mockResolvedValue(mockBinanceSymbols);
      mockSymbolRepo.findOne.mockResolvedValue(null);
      mockSymbolRepo.create.mockImplementation((data) => data);
      mockSymbolRepo.save.mockResolvedValue({});

      await service.syncSymbolsFromBinance();

      expect(mockExchangeService.initialize).toHaveBeenCalled();
      expect(mockExchangeService.getSymbols).toHaveBeenCalledWith('binance');
      expect(mockSymbolRepo.save).toHaveBeenCalledTimes(3);
    });

    it('should throw error when Binance exchange not initialized', async () => {
      mockExchangeService.initialize.mockResolvedValue(undefined);
      mockExchangeService.getExchange.mockReturnValue(null);

      await expect(service.syncSymbolsFromBinance()).rejects.toThrow(
        'Binance exchange not initialized',
      );
    });

    it('should throw error when no symbols received from Binance', async () => {
      mockExchangeService.initialize.mockResolvedValue(undefined);
      mockExchangeService.getExchange.mockReturnValue({ id: 'binance' });
      mockSymbolRepo.count.mockResolvedValue(0);
      mockExchangeService.getSymbols.mockResolvedValue([]);

      await expect(service.syncSymbolsFromBinance()).rejects.toThrow(
        'No symbols received from Binance',
      );
    });

    it('should reactivate existing inactive symbols', async () => {
      const mockBinanceSymbols = ['BTC'];
      const existingSymbol = { id: '1', symbol: 'BTC', isActive: false };

      mockExchangeService.initialize.mockResolvedValue(undefined);
      mockExchangeService.getExchange.mockReturnValue({ id: 'binance' });
      mockSymbolRepo.count.mockResolvedValue(1);
      mockExchangeService.getSymbols.mockResolvedValue(mockBinanceSymbols);
      mockSymbolRepo.findOne.mockResolvedValue(existingSymbol);
      mockSymbolRepo.save.mockResolvedValue({ ...existingSymbol, isActive: true });

      await service.syncSymbolsFromBinance();

      expect(mockSymbolRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });
  });
});
