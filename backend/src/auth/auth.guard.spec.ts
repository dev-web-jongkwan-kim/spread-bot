import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: AuthService;

  const mockAuthService = {
    verifyToken: jest.fn(),
  };

  const mockUserService = {
    getById: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    headers: any = {},
    cookies: any = {},
  ): ExecutionContext => {
    const mockRequest = {
      headers,
      cookies,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('Cookie Authentication', () => {
    it('should authenticate with valid cookie token', async () => {
      const mockPayload = { id: 'user-123', iat: 1234567890 };
      const mockUser = { id: 'user-123', telegramId: 123456, role: 'user' };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue(mockUser);

      const context = createMockExecutionContext({}, { auth_token: 'valid-cookie-token' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-cookie-token');
      expect(mockUserService.getById).toHaveBeenCalledWith('user-123');
      expect(context.switchToHttp().getRequest().user).toEqual({
        id: mockUser.id,
        telegramId: mockUser.telegramId,
        role: mockUser.role,
      });
    });

    it('should prioritize cookie over Authorization header', async () => {
      const mockPayload = { id: 'user-456', iat: 1234567890 };
      const mockUser = { id: 'user-456', telegramId: 456789, role: 'user' };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue(mockUser);

      const context = createMockExecutionContext(
        { authorization: 'Bearer header-token' },
        { auth_token: 'cookie-token' },
      );

      await guard.canActivate(context);

      // Should use cookie token, not header token
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('cookie-token');
    });

    it('should throw UnauthorizedException for invalid cookie token', async () => {
      mockAuthService.verifyToken.mockReturnValue(null);

      const context = createMockExecutionContext({}, { auth_token: 'invalid-token' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Authorization Header Authentication', () => {
    it('should authenticate with valid Bearer token', async () => {
      const mockPayload = { id: 'user-789', iat: 1234567890 };
      const mockUser = { id: 'user-789', telegramId: 789012, role: 'user' };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue(mockUser);

      const context = createMockExecutionContext({
        authorization: 'Bearer valid-header-token',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-header-token');
      expect(mockUserService.getById).toHaveBeenCalledWith('user-789');
      expect(context.switchToHttp().getRequest().user).toEqual({
        id: mockUser.id,
        telegramId: mockUser.telegramId,
        role: mockUser.role,
      });
    });

    it('should extract token correctly from Bearer scheme', async () => {
      const mockPayload = { id: 'user-101', iat: 1234567890 };
      const mockUser = { id: 'user-101', telegramId: 101112, role: 'user' };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue(mockUser);

      const context = createMockExecutionContext({
        authorization: 'Bearer abc123xyz',
      });

      await guard.canActivate(context);

      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('abc123xyz');
    });

    it('should throw UnauthorizedException for non-Bearer authorization', async () => {
      const context = createMockExecutionContext({
        authorization: 'Basic credentials',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid header token', async () => {
      mockAuthService.verifyToken.mockReturnValue(null);

      const context = createMockExecutionContext({
        authorization: 'Bearer invalid-token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Missing Token Cases', () => {
    it('should throw UnauthorizedException when no token provided', async () => {
      const context = createMockExecutionContext({}, {});

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuthService.verifyToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when authorization header is empty', async () => {
      const context = createMockExecutionContext({ authorization: '' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when cookie is null', async () => {
      const context = createMockExecutionContext({}, { auth_token: null });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Token Payload Validation', () => {
    it('should throw UnauthorizedException when payload has no id', async () => {
      mockAuthService.verifyToken.mockReturnValue({ iat: 1234567890 }); // Missing id

      const context = createMockExecutionContext({}, { auth_token: 'token' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should accept payload with additional fields', async () => {
      const mockPayload = {
        id: 'user-999',
        iat: 1234567890,
        exp: 9999999999,
        role: 'admin',
        custom: 'field',
      };
      const mockUser = { id: 'user-999', telegramId: 999888, role: 'admin' };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue(mockUser);

      const context = createMockExecutionContext({}, { auth_token: 'token' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(context.switchToHttp().getRequest().user).toEqual({
        id: mockUser.id,
        telegramId: mockUser.telegramId,
        role: mockUser.role,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed Authorization header gracefully', async () => {
      const context = createMockExecutionContext({
        authorization: 'Bearer',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle multiple spaces in Authorization header', async () => {
      const mockPayload = { id: 'user-multi', iat: 1234567890 };
      const mockUser = { id: 'user-multi', telegramId: 111222, role: 'user' };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue(mockUser);

      const context = createMockExecutionContext({
        authorization: 'Bearer  token-with-spaces',
      });

      await guard.canActivate(context);

      // Should extract ' token-with-spaces' (after 'Bearer ')
      expect(mockAuthService.verifyToken).toHaveBeenCalled();
    });

    it('should handle empty string token after Bearer', async () => {
      const context = createMockExecutionContext({
        authorization: 'Bearer ',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle cookies object being undefined', async () => {
      const mockRequest = {
        headers: {},
        cookies: undefined,
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Request User Attachment', () => {
    it('should attach user to request object', async () => {
      const mockPayload = { id: 'attach-user', iat: 1234567890 };
      const mockUser = { id: 'attach-user', telegramId: 333444, role: 'user' };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue(mockUser);

      const mockRequest = {
        headers: {},
        cookies: { auth_token: 'token' },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      await guard.canActivate(context);

      expect(mockRequest['user']).toEqual({
        id: mockUser.id,
        telegramId: mockUser.telegramId,
        role: mockUser.role,
      });
    });

    it('should not attach user when token is invalid', async () => {
      mockAuthService.verifyToken.mockReturnValue(null);

      const mockRequest = {
        headers: {},
        cookies: { auth_token: 'invalid' },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      try {
        await guard.canActivate(context);
      } catch (e) {
        // Expected to throw
      }

      expect(mockRequest['user']).toBeUndefined();
    });
  });
});
