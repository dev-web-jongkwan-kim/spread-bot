import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { UserRole } from '../common/constants';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let authService: AuthService;
  let userService: UserService;

  const mockAuthService = {
    verifyToken: jest.fn(),
  };

  const mockUserService = {
    getById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminGuard,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    guard = module.get<AdminGuard>(AdminGuard);
    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);

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

  const mockAdminUser = {
    id: 'admin-user-123',
    telegramId: 999000005,
    username: 'admin',
    role: UserRole.ADMIN,
  };

  const mockRegularUser = {
    id: 'regular-user-456',
    telegramId: 123456789,
    username: 'user',
    role: UserRole.USER,
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('Admin Authentication with Cookie', () => {
    it('should allow admin user with valid cookie', async () => {
      const mockPayload = { id: 'admin-user-123', iat: 1234567890 };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue(mockAdminUser);

      const context = createMockExecutionContext({}, { auth_token: 'valid-admin-token' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-admin-token');
      expect(mockUserService.getById).toHaveBeenCalledWith('admin-user-123');
      expect(context.switchToHttp().getRequest().user).toEqual({
        id: mockAdminUser.id,
        telegramId: mockAdminUser.telegramId,
        role: mockAdminUser.role,
      });
    });

    it('should prioritize cookie over Authorization header', async () => {
      const mockPayload = { id: 'admin-user-123', iat: 1234567890 };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue(mockAdminUser);

      const context = createMockExecutionContext(
        { authorization: 'Bearer header-token' },
        { auth_token: 'cookie-token' },
      );

      await guard.canActivate(context);

      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('cookie-token');
    });
  });

  describe('Admin Authentication with Bearer Token', () => {
    it('should allow admin user with valid Bearer token', async () => {
      const mockPayload = { id: 'admin-user-123', iat: 1234567890 };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue(mockAdminUser);

      const context = createMockExecutionContext({
        authorization: 'Bearer admin-bearer-token',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('admin-bearer-token');
    });

    it('should extract token correctly from Bearer scheme', async () => {
      const mockPayload = { id: 'admin-user-123', iat: 1234567890 };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue(mockAdminUser);

      const context = createMockExecutionContext({
        authorization: 'Bearer xyz789abc',
      });

      await guard.canActivate(context);

      expect(mockAuthService.verifyToken).toHaveBeenCalledWith('xyz789abc');
    });
  });

  describe('Authorization Failures', () => {
    it('should throw UnauthorizedException when no token provided', async () => {
      const context = createMockExecutionContext({}, {});

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuthService.verifyToken).not.toHaveBeenCalled();
      expect(mockUserService.getById).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockAuthService.verifyToken.mockReturnValue(null);

      const context = createMockExecutionContext({}, { auth_token: 'invalid-token' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when payload has no id', async () => {
      mockAuthService.verifyToken.mockReturnValue({ iat: 1234567890 });

      const context = createMockExecutionContext({}, { auth_token: 'token' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const mockPayload = { id: 'non-existent-user', iat: 1234567890 };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue(null);

      const context = createMockExecutionContext({}, { auth_token: 'token' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserService.getById).toHaveBeenCalledWith('non-existent-user');
    });
  });

  describe('Role-based Access Control', () => {
    it('should throw ForbiddenException for non-admin user', async () => {
      const mockPayload = { id: 'regular-user-456', iat: 1234567890 };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue(mockRegularUser);

      const context = createMockExecutionContext({}, { auth_token: 'user-token' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Admin access required',
      );
    });

    it('should reject user with null role', async () => {
      const mockPayload = { id: 'user-no-role', iat: 1234567890 };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue({
        ...mockRegularUser,
        role: null,
      });

      const context = createMockExecutionContext({}, { auth_token: 'token' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject user with undefined role', async () => {
      const mockPayload = { id: 'user-undefined-role', iat: 1234567890 };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue({
        ...mockRegularUser,
        role: undefined,
      });

      const context = createMockExecutionContext({}, { auth_token: 'token' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should only allow correct admin role value', async () => {
      const mockPayload = { id: 'user-admin-uppercase', iat: 1234567890 };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue({
        ...mockRegularUser,
        role: 'ADMIN', // uppercase, should fail (correct value is lowercase 'admin')
      });

      const context = createMockExecutionContext({}, { auth_token: 'token' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Request User Attachment', () => {
    it('should attach admin user info to request', async () => {
      const mockPayload = { id: 'admin-user-123', iat: 1234567890 };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue(mockAdminUser);

      const mockRequest = {
        headers: {},
        cookies: { auth_token: 'token' },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await guard.canActivate(context);

      expect(mockRequest['user']).toEqual({
        id: mockAdminUser.id,
        telegramId: mockAdminUser.telegramId,
        role: mockAdminUser.role,
      });
    });

    it('should not attach user when authorization fails', async () => {
      const mockPayload = { id: 'regular-user-456', iat: 1234567890 };
      mockAuthService.verifyToken.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue(mockRegularUser);

      const mockRequest = {
        headers: {},
        cookies: { auth_token: 'token' },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      try {
        await guard.canActivate(context);
      } catch (e) {
        // Expected to throw ForbiddenException
      }

      expect(mockRequest['user']).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed Bearer header', async () => {
      const context = createMockExecutionContext({
        authorization: 'Bearer',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle non-Bearer authorization', async () => {
      const context = createMockExecutionContext({
        authorization: 'Basic admin-credentials',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle cookies being undefined', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
            cookies: undefined,
          }),
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle empty authorization header', async () => {
      const context = createMockExecutionContext({
        authorization: '',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
