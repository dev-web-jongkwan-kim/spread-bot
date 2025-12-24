import { Test, TestingModule } from '@nestjs/testing';
import { TelegramUpdate } from './telegram.update';
import { UserService } from '../user/user.service';
import { AlertService } from '../alert/alert.service';
import { ExchangeService } from '../exchange/exchange.service';
import { PlanType, Language } from '../common/constants';

describe('TelegramUpdate', () => {
  let update: TelegramUpdate;
  let userService: UserService;
  let alertService: AlertService;
  let exchangeService: ExchangeService;

  const mockUserService = {
    getByTelegramId: jest.fn(),
    createOrUpdate: jest.fn(),
  };

  const mockAlertService = {
    getRecentAlerts: jest.fn(),
  };

  const mockExchangeService = {
    getPriceComparison: jest.fn(),
  };

  const createMockContext = (overrides = {}) => ({
    from: {
      id: 123456789,
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
    },
    message: {
      text: '/start',
    },
    reply: jest.fn(),
    answerCbQuery: jest.fn(),
    callbackQuery: null,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramUpdate,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: AlertService,
          useValue: mockAlertService,
        },
        {
          provide: ExchangeService,
          useValue: mockExchangeService,
        },
      ],
    }).compile();

    update = module.get<TelegramUpdate>(TelegramUpdate);
    userService = module.get<UserService>(UserService);
    alertService = module.get<AlertService>(AlertService);
    exchangeService = module.get<ExchangeService>(ExchangeService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(update).toBeDefined();
  });

  describe('startCommand', () => {
    it('should create new user if not exists', async () => {
      const ctx = createMockContext();
      mockUserService.getByTelegramId.mockResolvedValue(null);
      mockUserService.createOrUpdate.mockResolvedValue({
        id: 'user-123',
        telegramId: 123456789,
        plan: PlanType.FREE,
      });

      await update.startCommand(ctx as any);

      expect(mockUserService.getByTelegramId).toHaveBeenCalledWith(123456789);
      expect(mockUserService.createOrUpdate).toHaveBeenCalledWith(
        123456789,
        expect.objectContaining({
          telegramId: 123456789,
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          language: Language.EN,
          plan: PlanType.FREE,
          threshold: 1.0,
        }),
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Welcome to CryptoSpreadBot'),
        expect.objectContaining({ parse_mode: 'HTML' }),
      );
    });

    it('should not create user if already exists', async () => {
      const ctx = createMockContext();
      const existingUser = {
        id: 'user-123',
        telegramId: 123456789,
        plan: PlanType.PRO,
      };
      mockUserService.getByTelegramId.mockResolvedValue(existingUser);

      await update.startCommand(ctx as any);

      expect(mockUserService.createOrUpdate).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalled();
    });

    it('should handle missing user in context', async () => {
      const ctx = createMockContext({ from: null });

      await update.startCommand(ctx as any);

      expect(mockUserService.getByTelegramId).not.toHaveBeenCalled();
    });
  });

  describe('helpCommand', () => {
    it('should send help message', async () => {
      const ctx = createMockContext();

      await update.helpCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Commands:'),
        expect.objectContaining({ parse_mode: 'HTML' }),
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('/start'),
        expect.any(Object),
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('/price'),
        expect.any(Object),
      );
    });
  });

  describe('priceCommand', () => {
    it('should return price comparison for valid symbol', async () => {
      const ctx = createMockContext({
        message: { text: '/price BTC' },
      });

      const mockComparison = {
        symbol: 'BTC',
        prices: {
          binance: 50000,
          coinbase: 50500,
          kraken: 50250,
        },
        spreadPercent: 1.0,
        lowestExchange: 'binance',
        highestExchange: 'coinbase',
      };

      mockExchangeService.getPriceComparison.mockResolvedValue(mockComparison);

      await update.priceCommand(ctx as any);

      expect(mockExchangeService.getPriceComparison).toHaveBeenCalledWith(
        'BTC',
        expect.any(Array),
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('BTC Price Comparison'),
        expect.objectContaining({ parse_mode: 'HTML' }),
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Spread: 1.00%'),
        expect.any(Object),
      );
    });

    it('should handle missing symbol parameter', async () => {
      const ctx = createMockContext({
        message: { text: '/price' },
      });

      await update.priceCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith('Usage: /price BTC');
      expect(mockExchangeService.getPriceComparison).not.toHaveBeenCalled();
    });

    it('should handle symbol not found', async () => {
      const ctx = createMockContext({
        message: { text: '/price INVALID' },
      });

      mockExchangeService.getPriceComparison.mockResolvedValue(null);

      await update.priceCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Could not fetch price for INVALID'),
      );
    });

    it('should handle exchange service errors', async () => {
      const ctx = createMockContext({
        message: { text: '/price BTC' },
      });

      mockExchangeService.getPriceComparison.mockRejectedValue(
        new Error('Network error'),
      );

      await update.priceCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('An error occurred'),
      );
    });

    it('should convert symbol to uppercase', async () => {
      const ctx = createMockContext({
        message: { text: '/price eth' },
      });

      mockExchangeService.getPriceComparison.mockResolvedValue({
        symbol: 'ETH',
        prices: { binance: 3000 },
        spreadPercent: 0,
      });

      await update.priceCommand(ctx as any);

      expect(mockExchangeService.getPriceComparison).toHaveBeenCalledWith(
        'ETH',
        expect.any(Array),
      );
    });
  });

  describe('coinsCommand', () => {
    it('should list user coins', async () => {
      const ctx = createMockContext();
      const mockUser = {
        id: 'user-123',
        telegramId: 123456789,
        coins: [
          { symbol: 'BTC', isActive: true },
          { symbol: 'ETH', isActive: true },
          { symbol: 'SOL', isActive: false },
        ],
      };

      mockUserService.getByTelegramId.mockResolvedValue(mockUser);

      await update.coinsCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('BTC, ETH'),
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.not.stringContaining('SOL'),
      );
    });

    it('should handle user with no coins', async () => {
      const ctx = createMockContext();
      const mockUser = {
        id: 'user-123',
        telegramId: 123456789,
        coins: [],
      };

      mockUserService.getByTelegramId.mockResolvedValue(mockUser);

      await update.coinsCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('No coins added yet'),
      );
    });

    it('should handle user not found', async () => {
      const ctx = createMockContext();
      mockUserService.getByTelegramId.mockResolvedValue(null);

      await update.coinsCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Please use /start first'),
      );
    });

    it('should handle missing user in context', async () => {
      const ctx = createMockContext({ from: null });

      await update.coinsCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Please use /start first'),
      );
    });
  });

  describe('settingsCommand', () => {
    it('should display user settings', async () => {
      const ctx = createMockContext();
      const mockUser = {
        id: 'user-123',
        telegramId: 123456789,
        plan: PlanType.PRO,
        threshold: 2.5,
        coins: [
          { symbol: 'BTC', isActive: true },
          { symbol: 'ETH', isActive: true },
        ],
        exchanges: [
          { exchangeId: 'binance', isActive: true },
          { exchangeId: 'coinbase', isActive: true },
          { exchangeId: 'kraken', isActive: false },
        ],
      };

      mockUserService.getByTelegramId.mockResolvedValue(mockUser);

      await update.settingsCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Settings'),
        expect.objectContaining({ parse_mode: 'HTML' }),
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Plan: pro'),
        expect.any(Object),
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Threshold: 2.5%'),
        expect.any(Object),
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Coins: 2'),
        expect.any(Object),
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Exchanges: 2'),
        expect.any(Object),
      );
    });

    it('should handle FREE plan limits', async () => {
      const ctx = createMockContext();
      const mockUser = {
        id: 'user-123',
        telegramId: 123456789,
        plan: PlanType.FREE,
        threshold: 1.0,
        coins: [],
        exchanges: [],
      };

      mockUserService.getByTelegramId.mockResolvedValue(mockUser);

      await update.settingsCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Plan: free'),
        expect.any(Object),
      );
    });

    it('should handle user not found', async () => {
      const ctx = createMockContext();
      mockUserService.getByTelegramId.mockResolvedValue(null);

      await update.settingsCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Please use /start first'),
      );
    });
  });

  describe('callbackQuery', () => {
    it('should answer callback query', async () => {
      const ctx = createMockContext({
        callbackQuery: {
          data: 'test_callback',
        },
      });

      await update.callbackQuery(ctx as any);

      expect(ctx.answerCbQuery).toHaveBeenCalled();
    });

    it('should handle callback without query', async () => {
      const ctx = createMockContext({
        callbackQuery: null,
      });

      await expect(update.callbackQuery(ctx as any)).resolves.not.toThrow();
    });
  });
});
