import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { ConfigService } from '../config/config.service';
import { TelegramLoginDto } from './dto/telegram-login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let userService: UserService;
  let configService: ConfigService;

  const mockAuthService = {
    generateToken: jest.fn(),
    verifyToken: jest.fn(),
    generateRefreshToken: jest.fn().mockResolvedValue('mock-refresh-token'),
    revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
    refreshAccessToken: jest.fn(),
  };

  const mockUserService = {
    createOrUpdate: jest.fn(),
    getById: jest.fn(),
    getByTelegramId: jest.fn(),
    update: jest.fn(),
  };

  const mockConfigService = {
    telegramBotToken: 'test-bot-token',
    appEnv: 'development',
  };

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };

  const mockRequest = {
    headers: {
      'user-agent': 'test-user-agent',
    },
    ip: '127.0.0.1',
    cookies: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
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
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
    mockResponse.cookie.mockClear();
    mockResponse.clearCookie.mockClear();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('loginWithTelegram', () => {
    const validTelegramData: TelegramLoginDto = {
      id: 123456789,
      hash: 'valid-hash',
      auth_date: Math.floor(Date.now() / 1000),
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser',
    };

    const mockUser = {
      id: 'user-id-123',
      telegramId: 123456789,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      plan: 'free',
      role: 'user',
      threshold: 1.0,
      coins: [],
      exchanges: [],
      dailyAlertsSent: 0,
      createdAt: new Date(),
    };

    it('should login successfully with valid Telegram data', async () => {
      mockUserService.createOrUpdate.mockResolvedValue(mockUser);
      mockAuthService.generateToken.mockReturnValue('test-jwt-token');

      // Mock crypto for hash verification
      const crypto = require('crypto');
      jest.spyOn(crypto, 'createHash').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(Buffer.from('secret')),
      });
      jest.spyOn(crypto, 'createHmac').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(validTelegramData.hash),
      });

      const result = await controller.loginWithTelegram(
        validTelegramData,
        mockRequest as any,
        mockResponse as any,
      );

      expect(result.token).toBe('test-jwt-token');
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.telegram_id).toBe(mockUser.telegramId);
      expect(mockUserService.createOrUpdate).toHaveBeenCalledWith(
        validTelegramData.id,
        expect.objectContaining({
          telegramId: validTelegramData.id,
          username: validTelegramData.username,
        }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'auth_token',
        'test-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        }),
      );
    });

    it('should throw BadRequestException when hash is missing', async () => {
      const invalidData = { ...validTelegramData, hash: undefined };

      await expect(
        controller.loginWithTelegram(invalidData as any, mockRequest as any, mockResponse as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when auth_date is missing', async () => {
      const invalidData = { ...validTelegramData, auth_date: undefined };

      await expect(
        controller.loginWithTelegram(invalidData as any, mockRequest as any, mockResponse as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when auth_date is too old', async () => {
      const oldData = {
        ...validTelegramData,
        auth_date: Math.floor(Date.now() / 1000) - 400, // 400 seconds ago (> 5 minutes)
      };

      await expect(
        controller.loginWithTelegram(oldData, mockRequest as any, mockResponse as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should set secure cookie in production', async () => {
      mockUserService.createOrUpdate.mockResolvedValue(mockUser);
      mockAuthService.generateToken.mockReturnValue('test-jwt-token');

      // Mock production environment
      Object.defineProperty(configService, 'appEnv', {
        get: () => 'production',
        configurable: true,
      });

      const crypto = require('crypto');
      jest.spyOn(crypto, 'createHash').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(Buffer.from('secret')),
      });
      jest.spyOn(crypto, 'createHmac').mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue(validTelegramData.hash),
      });

      await controller.loginWithTelegram(validTelegramData, mockRequest as any, mockResponse as any);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'auth_token',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        }),
      );

      // Restore original value
      Object.defineProperty(configService, 'appEnv', {
        get: () => 'development',
        configurable: true,
      });
    });
  });

  describe('devLogin', () => {
    const mockUser = {
      id: 'dev-user-id',
      telegramId: 999000001,
      username: 'test_free',
      firstName: 'Test',
      lastName: 'Free',
      plan: 'free',
      role: 'user',
      threshold: 1.0,
      coins: [],
      exchanges: [],
      dailyAlertsSent: 0,
      createdAt: new Date(),
    };

    it('should login with FREE account in development', async () => {
      mockUserService.createOrUpdate.mockResolvedValue(mockUser);
      mockUserService.getById.mockResolvedValue(mockUser);
      mockAuthService.generateToken.mockReturnValue('dev-token');

      const result = await controller.devLogin(
        { account: 'free' },
        mockResponse as any,
      );

      expect(result.token).toBe('dev-token');
      expect(result.user.plan).toBe('free');
      expect(mockUserService.createOrUpdate).toHaveBeenCalledWith(
        999000001,
        expect.objectContaining({
          plan: 'free',
        }),
      );
    });

    it('should login with PRO account in development', async () => {
      const proUser = { ...mockUser, plan: 'pro', telegramId: 999000002 };
      mockUserService.createOrUpdate.mockResolvedValue(proUser);
      mockUserService.getById.mockResolvedValue(proUser);
      mockAuthService.generateToken.mockReturnValue('dev-token');

      const result = await controller.devLogin(
        { account: 'pro' },
        mockResponse as any,
      );

      expect(result.user.plan).toBe('pro');
    });

    it('should login with WHALE account in development', async () => {
      const whaleUser = { ...mockUser, plan: 'whale', telegramId: 999000003 };
      mockUserService.createOrUpdate.mockResolvedValue(whaleUser);
      mockUserService.getById.mockResolvedValue(whaleUser);
      mockAuthService.generateToken.mockReturnValue('dev-token');

      const result = await controller.devLogin(
        { account: 'whale' },
        mockResponse as any,
      );

      expect(result.user.plan).toBe('whale');
    });

    it('should create admin account with admin role', async () => {
      const adminUser = {
        ...mockUser,
        plan: 'whale',
        role: 'admin',
        telegramId: 999000005,
      };
      mockUserService.createOrUpdate.mockResolvedValue({ ...adminUser, role: 'user' });
      mockUserService.update.mockResolvedValue(adminUser);
      mockUserService.getById.mockResolvedValue(adminUser);
      mockAuthService.generateToken.mockReturnValue('admin-token');

      const result = await controller.devLogin(
        { account: 'admin' },
        mockResponse as any,
      );

      expect(mockUserService.update).toHaveBeenCalledWith(
        expect.any(String),
        { role: 'admin' },
      );
      expect(result.user.role).toBe('admin');
    });

    it('should throw UnauthorizedException in production', async () => {
      Object.defineProperty(configService, 'appEnv', {
        get: () => 'production',
        configurable: true,
      });

      await expect(
        controller.devLogin({ account: 'free' }, mockResponse as any),
      ).rejects.toThrow(UnauthorizedException);

      // Restore original value
      Object.defineProperty(configService, 'appEnv', {
        get: () => 'development',
        configurable: true,
      });
    });

    it('should throw BadRequestException for invalid account', async () => {
      await expect(
        controller.devLogin({ account: 'invalid' }, mockResponse as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when user not found after creation', async () => {
      mockUserService.createOrUpdate.mockResolvedValue(mockUser);
      mockUserService.getById.mockResolvedValue(null);
      mockAuthService.generateToken.mockReturnValue('dev-token');

      await expect(
        controller.devLogin({ account: 'free' }, mockResponse as any),
      ).rejects.toThrow('User not found after creation');
    });
  });

  describe('logout', () => {
    it('should clear auth cookie', async () => {
      const result = await controller.logout(mockRequest as any, mockResponse as any);

      expect(result.message).toBe('Logged out successfully');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('auth_token', {
        path: '/',
      });
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token', {
        path: '/',
      });
    });
  });

  describe('getCurrentUser', () => {
    const mockUser = {
      id: 'current-user-id',
      telegramId: 987654321,
      username: 'currentuser',
      firstName: 'Current',
      lastName: 'User',
      plan: 'pro',
      role: 'user',
      threshold: 2.5,
      coins: [
        { symbol: 'BTC', isActive: true },
        { symbol: 'ETH', isActive: true },
        { symbol: 'OLD', isActive: false },
      ],
      exchanges: [
        { exchangeId: 'binance', isActive: true },
        { exchangeId: 'coinbase', isActive: false },
      ],
      dailyAlertsSent: 5,
      createdAt: new Date(),
    };

    it('should return current user data', async () => {
      const mockRequest = { user: { id: 'current-user-id' } };
      mockUserService.getById.mockResolvedValue(mockUser);

      const result = await controller.getCurrentUser(mockRequest);

      expect(result.id).toBe(mockUser.id);
      expect(result.telegram_id).toBe(mockUser.telegramId);
      expect(result.plan).toBe(mockUser.plan);
      expect(result.coins).toEqual(['BTC', 'ETH']); // Only active coins
      expect(result.exchanges).toEqual(['binance']); // Only active exchanges
    });

    it('should throw UnauthorizedException when user ID is missing', async () => {
      const mockRequest = { user: {} };

      await expect(controller.getCurrentUser(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw error when user not found', async () => {
      const mockRequest = { user: { id: 'non-existent' } };
      mockUserService.getById.mockResolvedValue(null);

      await expect(controller.getCurrentUser(mockRequest)).rejects.toThrow(
        'User not found',
      );
    });

    it('should handle user with no coins or exchanges', async () => {
      const mockRequest = { user: { id: 'current-user-id' } };
      const userWithNoData = {
        ...mockUser,
        coins: null,
        exchanges: null,
      };
      mockUserService.getById.mockResolvedValue(userWithNoData);

      const result = await controller.getCurrentUser(mockRequest);

      expect(result.coins).toEqual([]);
      expect(result.exchanges).toEqual([]);
    });
  });
});
