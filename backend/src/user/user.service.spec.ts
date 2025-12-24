import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { PlanType } from '../common/constants';

describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;

  const mockUserRepository = {
    findByTelegramId: jest.fn(),
    findById: jest.fn(),
    findBySubscriptionId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    getAllMonitoredSymbols: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getByTelegramId', () => {
    it('should return user by telegram ID', async () => {
      const mockUser = {
        id: 'user-123',
        telegramId: 123456789,
        username: 'testuser',
        plan: PlanType.FREE,
      };
      mockUserRepository.findByTelegramId.mockResolvedValue(mockUser);

      const result = await service.getByTelegramId(123456789);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByTelegramId).toHaveBeenCalledWith(123456789);
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findByTelegramId.mockResolvedValue(null);

      const result = await service.getByTelegramId(999999999);

      expect(result).toBeNull();
    });

    it('should handle repository errors', async () => {
      mockUserRepository.findByTelegramId.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getByTelegramId(123456789)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('getById', () => {
    it('should return user by ID', async () => {
      const mockUser = {
        id: 'user-456',
        telegramId: 987654321,
        username: 'anotheruser',
        plan: PlanType.PRO,
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getById('user-456');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-456');
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await service.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createOrUpdate', () => {
    const telegramId = 555555555;
    const userData = {
      username: 'newuser',
      firstName: 'New',
      lastName: 'User',
      plan: PlanType.FREE,
    };

    it('should create new user when not exists', async () => {
      mockUserRepository.findByTelegramId.mockResolvedValue(null);
      const createdUser = {
        id: 'new-user-id',
        telegramId,
        ...userData,
      };
      mockUserRepository.create.mockResolvedValue(createdUser);

      const result = await service.createOrUpdate(telegramId, userData);

      expect(result).toEqual(createdUser);
      expect(mockUserRepository.findByTelegramId).toHaveBeenCalledWith(telegramId);
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          telegramId,
          ...userData,
        }),
      );
    });

    it('should update existing user', async () => {
      const existingUser = {
        id: 'existing-user-id',
        telegramId,
        username: 'oldusername',
        plan: PlanType.FREE,
      };
      mockUserRepository.findByTelegramId.mockResolvedValue(existingUser);

      const updatedUser = {
        ...existingUser,
        ...userData,
      };
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await service.createOrUpdate(telegramId, userData);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        existingUser.id,
        expect.objectContaining(userData),
      );
    });

    it('should preserve user ID when updating', async () => {
      const existingUser = {
        id: 'preserve-this-id',
        telegramId,
        username: 'olduser',
      };
      mockUserRepository.findByTelegramId.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({
        ...existingUser,
        ...userData,
      });

      await service.createOrUpdate(telegramId, userData);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        'preserve-this-id',
        expect.any(Object),
      );
    });

    it('should handle partial user data', async () => {
      mockUserRepository.findByTelegramId.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 'new-id',
        telegramId,
        username: 'partial',
      });

      const partialData = { username: 'partial' };
      await service.createOrUpdate(telegramId, partialData as any);

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          telegramId,
          username: 'partial',
        }),
      );
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const userId = 'user-to-update';
      const updateData = {
        threshold: 2.5,
        plan: PlanType.WHALE,
      };
      const updatedUser = {
        id: userId,
        telegramId: 111222333,
        ...updateData,
      };
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateData);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        userId,
        updateData,
      );
    });

    it('should handle update errors', async () => {
      mockUserRepository.update.mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(
        service.update('user-id', { threshold: 3.0 }),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null telegram ID', async () => {
      mockUserRepository.findByTelegramId.mockResolvedValue(null);

      const result = await service.getByTelegramId(null as any);

      expect(result).toBeNull();
    });

    it('should handle empty user ID', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await service.getById('');

      expect(result).toBeNull();
    });

    it('should handle very long telegram ID', async () => {
      const longId = 999999999999999;
      mockUserRepository.findByTelegramId.mockResolvedValue(null);

      await service.getByTelegramId(longId);

      expect(mockUserRepository.findByTelegramId).toHaveBeenCalledWith(longId);
    });

    it('should handle special characters in username', async () => {
      mockUserRepository.findByTelegramId.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 'id',
        telegramId: 123,
        username: 'user@#$%',
      });

      const userData = {
        username: 'user@#$%',
        firstName: 'Test',
      };

      await service.createOrUpdate(123, userData as any);

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'user@#$%',
        }),
      );
    });
  });

  describe('Plan Management', () => {
    it('should handle FREE plan creation', async () => {
      mockUserRepository.findByTelegramId.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({
        id: 'id',
        telegramId: 123,
        plan: PlanType.FREE,
      });

      await service.createOrUpdate(123, { plan: PlanType.FREE } as any);

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: PlanType.FREE,
        }),
      );
    });

    it('should handle PRO plan upgrade', async () => {
      const existingUser = {
        id: 'user-id',
        telegramId: 123,
        plan: PlanType.FREE,
      };
      mockUserRepository.findByTelegramId.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({
        ...existingUser,
        plan: PlanType.PRO,
      });

      await service.createOrUpdate(123, { plan: PlanType.PRO } as any);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        'user-id',
        expect.objectContaining({
          plan: PlanType.PRO,
        }),
      );
    });

    it('should handle WHALE plan upgrade', async () => {
      const existingUser = {
        id: 'user-id',
        telegramId: 123,
        plan: PlanType.PRO,
      };
      mockUserRepository.findByTelegramId.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue({
        ...existingUser,
        plan: PlanType.WHALE,
      });

      await service.createOrUpdate(123, { plan: PlanType.WHALE } as any);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        'user-id',
        expect.objectContaining({
          plan: PlanType.WHALE,
        }),
      );
    });
  });
});
