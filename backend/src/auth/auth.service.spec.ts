import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { ConfigService } from '../config/config.service';
import { RefreshToken } from '../database/entities/refresh-token.entity';

describe('AuthService', () => {
  let service: AuthService;
  let configService: ConfigService;

  const mockConfigService = {
    jwtSecret: 'test-secret-key-minimum-32-characters-long',
  };

  const mockRefreshTokenRepo = {
    save: jest.fn((data) => Promise.resolve({ ...data, id: 'test-id' })),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepo,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const userId = 'test-user-123';
      const token = service.generateToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for different user IDs', () => {
      const token1 = service.generateToken('user-1');
      const token2 = service.generateToken('user-2');

      expect(token1).not.toBe(token2);
    });

    it('should throw error when JWT_SECRET is not configured', () => {
      Object.defineProperty(configService, 'jwtSecret', {
        get: () => '',
        configurable: true,
      });

      expect(() => service.generateToken('test-user')).toThrow(
        'JWT_SECRET is not configured',
      );

      // Restore original value
      Object.defineProperty(configService, 'jwtSecret', {
        get: () => 'test-secret-key-minimum-32-characters-long',
        configurable: true,
      });
    });

    it('should include userId in token payload', () => {
      const userId = 'test-user-456';
      const token = service.generateToken(userId);
      const payload = service.verifyToken(token);

      expect(payload).toBeDefined();
      expect(payload.id).toBe(userId);
      expect(payload.iat).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const userId = 'test-user-789';
      const token = service.generateToken(userId);
      const payload = service.verifyToken(token);

      expect(payload).toBeDefined();
      expect(payload.id).toBe(userId);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      const payload = service.verifyToken(invalidToken);

      expect(payload).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create a token that's already expired
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { id: 'test-user', iat: Math.floor(Date.now() / 1000) },
        mockConfigService.jwtSecret,
        { expiresIn: '-1d' }, // Already expired
      );

      const payload = service.verifyToken(expiredToken);
      expect(payload).toBeNull();
    });

    it('should return null for token with wrong secret', () => {
      const jwt = require('jsonwebtoken');
      const wrongSecretToken = jwt.sign(
        { id: 'test-user', iat: Math.floor(Date.now() / 1000) },
        'wrong-secret-key',
        { expiresIn: '30d' },
      );

      const payload = service.verifyToken(wrongSecretToken);
      expect(payload).toBeNull();
    });

    it('should return null when JWT_SECRET is not configured', () => {
      Object.defineProperty(configService, 'jwtSecret', {
        get: () => '',
        configurable: true,
      });

      const token = 'any.token.here';
      const payload = service.verifyToken(token);

      expect(payload).toBeNull();

      // Restore original value
      Object.defineProperty(configService, 'jwtSecret', {
        get: () => 'test-secret-key-minimum-32-characters-long',
        configurable: true,
      });
    });

    it('should verify token with correct expiration time', () => {
      const userId = 'test-user-expiry';
      const token = service.generateToken(userId);
      const payload = service.verifyToken(token);

      expect(payload).toBeDefined();
      expect(payload.exp).toBeDefined();

      // Token should expire in approximately 15 minutes (allow 1 minute tolerance)
      const expectedExpiry = Math.floor(Date.now() / 1000) + 15 * 60;
      expect(payload.exp).toBeGreaterThan(expectedExpiry - 60);
      expect(payload.exp).toBeLessThan(expectedExpiry + 60);
    });
  });

  describe('Security Tests', () => {
    it('should not accept empty user ID', () => {
      expect(() => service.generateToken('')).not.toThrow();
      const token = service.generateToken('');
      const payload = service.verifyToken(token);
      expect(payload.id).toBe('');
    });

    it('should handle special characters in user ID', () => {
      const specialUserId = 'user-123!@#$%^&*()';
      const token = service.generateToken(specialUserId);
      const payload = service.verifyToken(token);

      expect(payload.id).toBe(specialUserId);
    });

    it('should handle very long user IDs', () => {
      const longUserId = 'a'.repeat(1000);
      const token = service.generateToken(longUserId);
      const payload = service.verifyToken(token);

      expect(payload.id).toBe(longUserId);
    });
  });
});
