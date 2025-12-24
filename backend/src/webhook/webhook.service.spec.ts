import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { WebhookService } from './webhook.service';
import { UserService } from '../user/user.service';
import { ConfigService } from '../config/config.service';
import { TelegramService } from '../telegram/telegram.service';
import { PlanType } from '../common/constants';
import { WebhookEvent } from '../database/entities/webhook-event.entity';

describe('WebhookService', () => {
  let service: WebhookService;
  let userService: UserService;
  let configService: ConfigService;
  let telegramService: TelegramService;

  const mockUserService = {
    getBySubscriptionId: jest.fn(),
    update: jest.fn(),
  };

  const mockConfigService = {
    lsVariantProMonthly: 'pro-monthly-variant',
    lsVariantProYearly: 'pro-yearly-variant',
    lsVariantWhaleMonthly: 'whale-monthly-variant',
    lsVariantWhaleYearly: 'whale-yearly-variant',
  };

  const mockTelegramService = {
    sendMessage: jest.fn(),
  };

  const mockEntityManager = {
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockDataSource = {
    transaction: jest.fn((callback) => callback(mockEntityManager)),
  };

  const mockWebhookEventRepo = {
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve(data)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(WebhookEvent),
          useValue: mockWebhookEventRepo,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: TelegramService,
          useValue: mockTelegramService,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    userService = module.get<UserService>(UserService);
    configService = module.get<ConfigService>(ConfigService);
    telegramService = module.get<TelegramService>(TelegramService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleLemonSqueezyWebhook', () => {
    const mockUser = {
      id: 'user-123',
      telegramId: 123456789,
      lsSubscriptionId: 'sub-123',
      plan: PlanType.FREE,
    };

    it('should handle subscription_created event', async () => {
      const payload = {
        data: {
          id: 'sub-123',
          attributes: {
            variant_id: 'pro-monthly-variant',
            status: 'active',
            ends_at: '2024-12-31',
          },
        },
      };

      mockUserService.getBySubscriptionId.mockResolvedValue(mockUser);

      await service.handleLemonSqueezyWebhook('subscription_created', payload);

      expect(mockUserService.getBySubscriptionId).toHaveBeenCalledWith('sub-123');
      expect(mockEntityManager.update).toHaveBeenCalledWith(
        expect.anything(), // User entity
        'user-123',
        expect.objectContaining({
          plan: PlanType.PRO,
          lsSubscriptionStatus: 'active',
        }),
      );
    });

    it('should upgrade to WHALE plan for whale variant', async () => {
      const payload = {
        data: {
          id: 'sub-123',
          attributes: {
            variant_id: 'whale-yearly-variant',
            status: 'active',
          },
        },
      };

      mockUserService.getBySubscriptionId.mockResolvedValue(mockUser);

      await service.handleLemonSqueezyWebhook('subscription_updated', payload);

      expect(mockEntityManager.update).toHaveBeenCalledWith(
        expect.anything(),
        'user-123',
        expect.objectContaining({
          plan: PlanType.WHALE,
        }),
      );
    });

    it('should handle subscription_cancelled event', async () => {
      const payload = {
        data: {
          id: 'sub-123',
          attributes: {
            status: 'cancelled',
          },
        },
      };

      mockUserService.getBySubscriptionId.mockResolvedValue(mockUser);

      await service.handleLemonSqueezyWebhook('subscription_cancelled', payload);

      expect(mockEntityManager.update).toHaveBeenCalledWith(
        expect.anything(),
        'user-123',
        expect.objectContaining({
          plan: PlanType.FREE,
          lsSubscriptionId: null,
          lsSubscriptionStatus: 'cancelled',
          lsCurrentPeriodEnd: null,
        }),
      );
    });

    it('should handle subscription_expired event', async () => {
      const payload = {
        data: {
          id: 'sub-123',
          attributes: {
            status: 'expired',
          },
        },
      };

      mockUserService.getBySubscriptionId.mockResolvedValue(mockUser);

      await service.handleLemonSqueezyWebhook('subscription_expired', payload);

      expect(mockEntityManager.update).toHaveBeenCalledWith(
        expect.anything(),
        'user-123',
        expect.objectContaining({
          plan: PlanType.FREE,
          lsSubscriptionId: null,
        }),
      );
    });

    it('should throw BadRequestException when subscription ID is missing', async () => {
      const payload = {
        data: {},
      };

      await expect(
        service.handleLemonSqueezyWebhook('subscription_created', payload)
      ).rejects.toThrow(BadRequestException);

      expect(mockUserService.getBySubscriptionId).not.toHaveBeenCalled();
      expect(mockEntityManager.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException when user not found', async () => {
      const payload = {
        data: {
          id: 'sub-999',
        },
      };

      mockUserService.getBySubscriptionId.mockResolvedValue(null);

      await expect(
        service.handleLemonSqueezyWebhook('subscription_created', payload)
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockUserService.getBySubscriptionId).toHaveBeenCalledWith('sub-999');
      expect(mockEntityManager.update).not.toHaveBeenCalled();
    });

    it('should handle subscription_payment_failed event - first failure (grace period)', async () => {
      const payload = {
        data: {
          id: 'sub-123',
          attributes: {
            status: 'past_due',
          },
        },
      };

      mockUserService.getBySubscriptionId.mockResolvedValue({
        id: 'user-123',
        telegramId: 123456789,
        plan: PlanType.PRO,
        paymentFailureCount: 0,
      });
      mockTelegramService.sendMessage.mockResolvedValue(undefined);

      await service.handleLemonSqueezyWebhook('subscription_payment_failed', payload);

      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining('결제가 실패했습니다 (1/3회)'),
      );
      expect(mockEntityManager.update).toHaveBeenCalledWith(
        expect.anything(),
        'user-123',
        expect.objectContaining({
          paymentFailureCount: 1,
          paymentFailedAt: expect.any(Date),
          gracePeriodEndsAt: expect.any(Date),
        }),
      );
    });

    it('should continue processing even if telegram notification fails', async () => {
      const payload = {
        data: {
          id: 'sub-123',
          attributes: {
            status: 'past_due',
          },
        },
      };

      mockUserService.getBySubscriptionId.mockResolvedValue({
        id: 'user-123',
        telegramId: 123456789,
        plan: PlanType.PRO,
        paymentFailureCount: 0,
      });
      mockTelegramService.sendMessage.mockRejectedValue(new Error('Telegram API error'));

      await service.handleLemonSqueezyWebhook('subscription_payment_failed', payload);

      expect(mockTelegramService.sendMessage).toHaveBeenCalled();
      expect(mockEntityManager.update).toHaveBeenCalledWith(
        expect.anything(),
        'user-123',
        expect.objectContaining({
          paymentFailureCount: 1,
          paymentFailedAt: expect.any(Date),
          gracePeriodEndsAt: expect.any(Date),
        }),
      );
    });

    it('should downgrade to FREE after 3 payment failures', async () => {
      const payload = {
        data: {
          id: 'sub-123',
          attributes: {
            status: 'past_due',
          },
        },
      };

      mockUserService.getBySubscriptionId.mockResolvedValue({
        id: 'user-123',
        telegramId: 123456789,
        plan: PlanType.PRO,
        paymentFailureCount: 2, // 3rd failure
      });
      mockTelegramService.sendMessage.mockResolvedValue(undefined);

      await service.handleLemonSqueezyWebhook('subscription_payment_failed', payload);

      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        123456789,
        expect.stringContaining('3회 실패'),
      );
      // Should be called twice: once for downgrade, once for reset
      expect(mockEntityManager.update).toHaveBeenCalledTimes(2);
      expect(mockEntityManager.update).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        'user-123',
        expect.objectContaining({
          plan: PlanType.FREE,
          lsSubscriptionId: null,
        }),
      );
      expect(mockEntityManager.update).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        'user-123',
        expect.objectContaining({
          paymentFailureCount: 0,
          paymentFailedAt: null,
          gracePeriodEndsAt: null,
        }),
      );
    });

    it('should handle unknown event types gracefully', async () => {
      const payload = {
        data: {
          id: 'sub-123',
        },
      };

      mockUserService.getBySubscriptionId.mockResolvedValue(mockUser);

      await service.handleLemonSqueezyWebhook('unknown_event', payload);

      expect(mockEntityManager.update).not.toHaveBeenCalled();
    });
  });
});
