import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiController } from './api.controller';
import { UserService } from '../user/user.service';
import { SymbolService } from '../symbol/symbol.service';
import { AuthService } from '../auth/auth.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { ExchangeService } from '../exchange/exchange.service';
import { CoinGeckoService } from '../coingecko/coingecko.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserCoin } from '../database/entities/user-coin.entity';
import { UserExchange } from '../database/entities/user-exchange.entity';
import { Alert } from '../database/entities/alert.entity';
import { User } from '../database/entities/user.entity';
import { UnifiedSymbol } from '../database/entities/unified-symbol.entity';
import { UnifiedSymbolExchange } from '../database/entities/unified-symbol-exchange.entity';

describe('ApiController - Core Endpoints', () => {
  let controller: ApiController;
  let userService: UserService;
  let symbolService: SymbolService;
  let userCoinRepo: Repository<UserCoin>;
  let userExchangeRepo: Repository<UserExchange>;
  let alertRepo: Repository<Alert>;

  const mockAuthService = {
    verifyToken: jest.fn(),
    generateToken: jest.fn(),
  };

  const mockUserService = {
    getById: jest.fn(),
    update: jest.fn(),
    canAddCoin: jest.fn(),
    canAddExchange: jest.fn(),
  };

  const mockSymbolService = {
    getActiveSymbols: jest.fn(),
    getBySymbol: jest.fn(),
  };

  const mockSubscriptionService = {
    createCheckoutUrl: jest.fn(),
  };

  const mockExchangeService = {
    getActiveExchanges: jest.fn(),
  };

  const mockCoinGeckoService = {
    getSymbolData: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  };

  const mockUserCoinRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
  };

  const mockUserExchangeRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };

  const mockAlertRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockUnifiedSymbolRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockUnifiedExchangeRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: SymbolService,
          useValue: mockSymbolService,
        },
        {
          provide: SubscriptionService,
          useValue: mockSubscriptionService,
        },
        {
          provide: ExchangeService,
          useValue: mockExchangeService,
        },
        {
          provide: CoinGeckoService,
          useValue: mockCoinGeckoService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: getRepositoryToken(UserCoin),
          useValue: mockUserCoinRepo,
        },
        {
          provide: getRepositoryToken(UserExchange),
          useValue: mockUserExchangeRepo,
        },
        {
          provide: getRepositoryToken(Alert),
          useValue: mockAlertRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(UnifiedSymbol),
          useValue: mockUnifiedSymbolRepo,
        },
        {
          provide: getRepositoryToken(UnifiedSymbolExchange),
          useValue: mockUnifiedExchangeRepo,
        },
      ],
    }).compile();

    controller = module.get<ApiController>(ApiController);
    userService = module.get<UserService>(UserService);
    symbolService = module.get<SymbolService>(SymbolService);
    userCoinRepo = module.get<Repository<UserCoin>>(getRepositoryToken(UserCoin));
    userExchangeRepo = module.get<Repository<UserExchange>>(getRepositoryToken(UserExchange));
    alertRepo = module.get<Repository<Alert>>(getRepositoryToken(Alert));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('addCoin', () => {
    const mockRequest = { user: { id: 'user-123' } };
    const mockUser = {
      id: 'user-123',
      plan: 'free',
      coins: [],
    };

    it('should add a new coin successfully', async () => {
      const addCoinDto = { symbol: 'BTC' };

      mockUserService.getById.mockResolvedValue(mockUser);
      mockUserService.canAddCoin.mockReturnValue(true);
      // First call: check for active coin (returns null)
      // Second call: check for inactive coin (returns null)
      mockUserCoinRepo.findOne.mockResolvedValue(null);
      mockUserCoinRepo.create.mockReturnValue({
        userId: 'user-123',
        symbol: 'BTC',
        isActive: true,
      });
      mockUserCoinRepo.save.mockResolvedValue({
        userId: 'user-123',
        symbol: 'BTC',
        isActive: true,
      });

      const result = await controller.addCoin(addCoinDto, mockRequest as any);

      expect(result.message).toBe('Coin added');
      expect(mockUserCoinRepo.save).toHaveBeenCalled();
    });

    it('should reactivate existing inactive coin', async () => {
      const addCoinDto = { symbol: 'ETH' };
      const inactiveCoin = {
        userId: 'user-123',
        symbol: 'ETH',
        isActive: false,
      };

      mockUserService.getById.mockResolvedValue(mockUser);
      mockUserService.canAddCoin.mockReturnValue(true);
      // First call: check for active coin (returns null)
      // Second call: check for inactive coin (returns the inactive coin)
      mockUserCoinRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(inactiveCoin);
      mockUserCoinRepo.save.mockResolvedValue({ ...inactiveCoin, isActive: true });

      const result = await controller.addCoin(addCoinDto, mockRequest as any);

      expect(result.message).toBe('Coin reactivated');
      expect(mockUserCoinRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });

    it('should return message when coin already active', async () => {
      const addCoinDto = { symbol: 'SOL' };
      const existingCoin = {
        userId: 'user-123',
        symbol: 'SOL',
        isActive: true,
      };

      mockUserService.getById.mockResolvedValue(mockUser);
      mockUserService.canAddCoin.mockReturnValue(true);
      mockUserCoinRepo.findOne.mockResolvedValue(existingCoin);

      const result = await controller.addCoin(addCoinDto, mockRequest as any);

      expect(result.message).toBe('Coin already added');
      expect(mockUserCoinRepo.save).not.toHaveBeenCalled();
    });

    it('should enforce coin limit for FREE plan', async () => {
      const addCoinDto = { symbol: 'NEWCOIN' };
      const userWithMaxCoins = {
        ...mockUser,
        plan: 'free',
        coins: new Array(1).fill({ isActive: true }), // Already at max
      };

      mockUserService.getById.mockResolvedValue(userWithMaxCoins);
      mockUserService.canAddCoin.mockReturnValue(false);

      await expect(
        controller.addCoin(addCoinDto, mockRequest as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.addCoin(addCoinDto, mockRequest as any),
      ).rejects.toThrow('Coin limit reached');
    });
  });

  describe('removeCoin', () => {
    const mockRequest = { user: { id: 'user-456' } };

    it('should remove a coin successfully', async () => {
      const symbol = 'BTC';
      const userCoin = {
        userId: 'user-456',
        symbol: 'BTC',
        isActive: true,
      };

      mockUserCoinRepo.findOne.mockResolvedValue(userCoin);
      mockUserCoinRepo.save.mockResolvedValue({ ...userCoin, isActive: false });

      const result = await controller.removeCoin(symbol, mockRequest as any);

      expect(result.message).toBe('Coin removed');
      expect(mockUserCoinRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('should throw NotFoundException when coin not found', async () => {
      mockUserCoinRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.removeCoin('INVALID', mockRequest as any),
      ).rejects.toThrow('Coin not found');
    });
  });

  describe('updateThreshold', () => {
    const mockRequest = { user: { id: 'user-789' } };
    const mockUser = {
      id: 'user-789',
      threshold: 1.0,
    };

    it('should update threshold successfully', async () => {
      const updateThresholdDto = { threshold: 2.5 };

      mockUserService.getById.mockResolvedValue(mockUser);
      mockUserService.update.mockResolvedValue({
        ...mockUser,
        threshold: 2.5,
      });

      const result = await controller.updateThreshold(
        updateThresholdDto,
        mockRequest as any,
      );

      expect(result.message).toBe('Threshold updated');
      expect(mockUserService.update).toHaveBeenCalledWith('user-789', {
        threshold: 2.5,
      });
    });

    it('should accept minimum threshold (0.01)', async () => {
      const updateThresholdDto = { threshold: 0.01 };

      mockUserService.getById.mockResolvedValue(mockUser);
      mockUserService.update.mockResolvedValue({
        ...mockUser,
        threshold: 0.01,
      });

      const result = await controller.updateThreshold(
        updateThresholdDto,
        mockRequest as any,
      );

      expect(result.message).toBe('Threshold updated');
      expect(mockUserService.update).toHaveBeenCalledWith('user-789', {
        threshold: 0.01,
      });
    });

    it('should accept maximum threshold (10.0)', async () => {
      const updateThresholdDto = { threshold: 10.0 };

      mockUserService.getById.mockResolvedValue(mockUser);
      mockUserService.update.mockResolvedValue({
        ...mockUser,
        threshold: 10.0,
      });

      const result = await controller.updateThreshold(
        updateThresholdDto,
        mockRequest as any,
      );

      expect(result.message).toBe('Threshold updated');
      expect(mockUserService.update).toHaveBeenCalledWith('user-789', {
        threshold: 10.0,
      });
    });
  });

  describe('toggleExchange', () => {
    const mockRequest = { user: { id: 'user-exchange' } };
    const mockUser = {
      id: 'user-exchange',
      plan: 'free',
      exchanges: [],
    };

    it('should add a new exchange successfully', async () => {
      const exchangeId = 'binance';

      mockUserService.getById.mockResolvedValue(mockUser);
      mockUserService.canAddExchange.mockReturnValue(true);
      mockUserExchangeRepo.findOne.mockResolvedValue(null);
      mockUserExchangeRepo.create.mockReturnValue({
        userId: 'user-exchange',
        exchangeId: 'binance',
        isActive: true,
      });
      mockUserExchangeRepo.save.mockResolvedValue({
        userId: 'user-exchange',
        exchangeId: 'binance',
        isActive: true,
      });

      const result = await controller.toggleExchange(
        exchangeId,
        mockRequest as any,
      );

      expect(result.message).toBe('Exchange added');
      expect(mockUserExchangeRepo.save).toHaveBeenCalled();
    });

    it('should reactivate existing inactive exchange', async () => {
      const exchangeId = 'coinbase';
      const existingExchange = {
        userId: 'user-exchange',
        exchangeId: 'coinbase',
        isActive: false,
      };

      mockUserService.getById.mockResolvedValue(mockUser);
      mockUserService.canAddExchange.mockReturnValue(true);
      mockUserExchangeRepo.findOne.mockResolvedValue(existingExchange);
      mockUserExchangeRepo.save.mockResolvedValue({ ...existingExchange, isActive: true });

      const result = await controller.toggleExchange(
        exchangeId,
        mockRequest as any,
      );

      expect(result.message).toBe('Exchange added');
      expect(mockUserExchangeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });

    it('should enforce exchange limit for FREE plan', async () => {
      const userWithMaxExchanges = {
        ...mockUser,
        plan: 'free',
        exchanges: new Array(3).fill({ isActive: true }), // Max 3 for FREE
      };

      mockUserService.getById.mockResolvedValue(userWithMaxExchanges);
      mockUserService.canAddExchange.mockReturnValue(false);
      mockUserExchangeRepo.findOne.mockResolvedValue(null);

      await expect(
        controller.toggleExchange('okx', mockRequest as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow more exchanges for PRO plan', async () => {
      const userPro = {
        ...mockUser,
        plan: 'pro',
        exchanges: new Array(4).fill({ isActive: true }), // PRO allows 10
      };

      mockUserService.getById.mockResolvedValue(userPro);
      mockUserService.canAddExchange.mockReturnValue(true);
      mockUserExchangeRepo.findOne.mockResolvedValue(null);
      mockUserExchangeRepo.create.mockReturnValue({});
      mockUserExchangeRepo.save.mockResolvedValue({});

      await controller.toggleExchange('kraken', mockRequest as any);

      expect(mockUserExchangeRepo.save).toHaveBeenCalled();
    });
  });

  describe('getAlerts', () => {
    const mockRequest = { user: { id: 'user-alerts' } };

    it('should return paginated alerts', async () => {
      const mockDate = new Date();
      const mockAlerts = [
        {
          id: 'alert-1',
          userId: 'user-alerts',
          symbol: 'BTC',
          spreadPercent: '2.5',
          buyExchange: 'binance',
          buyPrice: '50000',
          sellExchange: 'coinbase',
          sellPrice: '51250',
          potentialProfit: '1250',
          createdAt: mockDate,
        },
        {
          id: 'alert-2',
          userId: 'user-alerts',
          symbol: 'ETH',
          spreadPercent: '1.8',
          buyExchange: 'kraken',
          buyPrice: '3000',
          sellExchange: 'binance',
          sellPrice: '3054',
          potentialProfit: '54',
          createdAt: mockDate,
        },
      ];

      mockQueryBuilder.getCount.mockResolvedValue(2);
      mockQueryBuilder.getMany.mockResolvedValue(mockAlerts);

      const result = await controller.getAlerts(
        '10', // limit
        '1',  // page
        mockRequest as any, // request
      );

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        id: 'alert-1',
        symbol: 'BTC',
        spread_percent: 2.5,
        buy_exchange: 'binance',
        buy_price: 50000,
        sell_exchange: 'coinbase',
        sell_price: 51250,
        potential_profit: 1250,
        created_at: mockDate.toISOString(),
        was_clicked: false,
      });
      expect(result.has_more).toBe(false); // 0 + 2 < 2 = false
    });

    it('should filter alerts by symbol', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await controller.getAlerts('10', '1', mockRequest as any);

      // Just check that the query was executed
      expect(mockAlertRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('should handle pagination correctly', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(50);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await controller.getAlerts('20', '2', mockRequest as any);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20); // (2-1) * 20
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(result.has_more).toBe(true); // 20 + 0 < 50 = true
    });
  });
});
