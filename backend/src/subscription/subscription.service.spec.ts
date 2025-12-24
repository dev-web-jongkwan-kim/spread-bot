import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { ConfigService } from '../config/config.service';
import { PlanType } from '../common/constants';

// Mock fetch globally
global.fetch = jest.fn();

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let configService: ConfigService;

  const mockConfigService = {
    lsVariantBasicMonthly: 'basic-monthly-id',
    lsVariantBasicYearly: 'basic-yearly-id',
    lsVariantProMonthly: 'pro-monthly-id',
    lsVariantProYearly: 'pro-yearly-id',
    lsVariantWhaleMonthly: 'whale-monthly-id',
    lsVariantWhaleYearly: 'whale-yearly-id',
    lemonsqueezyApiKey: 'test-api-key',
    lemonsqueezyStoreId: 'test-store-id',
    telegramBotToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getVariantId', () => {
    it('should return BASIC monthly variant ID', () => {
      const result = service.getVariantId(PlanType.BASIC, false);
      expect(result).toBe('basic-monthly-id');
    });

    it('should return BASIC yearly variant ID', () => {
      const result = service.getVariantId(PlanType.BASIC, true);
      expect(result).toBe('basic-yearly-id');
    });

    it('should return PRO monthly variant ID', () => {
      const result = service.getVariantId(PlanType.PRO, false);
      expect(result).toBe('pro-monthly-id');
    });

    it('should return PRO yearly variant ID', () => {
      const result = service.getVariantId(PlanType.PRO, true);
      expect(result).toBe('pro-yearly-id');
    });

    it('should return WHALE monthly variant ID', () => {
      const result = service.getVariantId(PlanType.WHALE, false);
      expect(result).toBe('whale-monthly-id');
    });

    it('should return WHALE yearly variant ID', () => {
      const result = service.getVariantId(PlanType.WHALE, true);
      expect(result).toBe('whale-yearly-id');
    });

    it('should return empty string for FREE plan', () => {
      const result = service.getVariantId(PlanType.FREE, false);
      expect(result).toBe('');
    });
  });

  describe('createCheckout', () => {
    it('should create checkout URL successfully', async () => {
      const mockCheckoutUrl = 'https://checkout.lemonsqueezy.com/abc123';
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 201,
        json: async () => ({
          data: {
            attributes: {
              url: mockCheckoutUrl,
            },
          },
        }),
      });

      const result = await service.createCheckout(
        123456789,
        'pro-monthly-id',
        PlanType.PRO,
      );

      expect(result).toBe(mockCheckoutUrl);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.lemonsqueezy.com/v1/checkouts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        }),
      );
    });

    it('should include telegram_id and plan in custom data', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 201,
        json: async () => ({
          data: { attributes: { url: 'https://checkout.url' } },
        }),
      });

      await service.createCheckout(987654321, 'whale-yearly-id', PlanType.WHALE);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.data.attributes.checkout_data.custom).toEqual({
        telegram_id: '987654321',
        plan: PlanType.WHALE,
      });
    });

    it('should include redirect URL with bot username', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 201,
        json: async () => ({
          data: { attributes: { url: 'https://checkout.url' } },
        }),
      });

      await service.createCheckout(123, 'pro-monthly-id', PlanType.PRO);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.data.attributes.product_options.redirect_url).toBe(
        'https://t.me/123456?start=payment_success',
      );
    });

    it('should return null when API key is missing', async () => {
      const serviceWithoutApiKey = new SubscriptionService({
        ...mockConfigService,
        lemonsqueezyApiKey: '',
      } as any);

      const result = await serviceWithoutApiKey.createCheckout(
        123,
        'pro-monthly-id',
        PlanType.PRO,
      );

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return null when store ID is missing', async () => {
      const serviceWithoutStoreId = new SubscriptionService({
        ...mockConfigService,
        lemonsqueezyStoreId: '',
      } as any);

      const result = await serviceWithoutStoreId.createCheckout(
        123,
        'pro-monthly-id',
        PlanType.PRO,
      );

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return null when variant ID is missing', async () => {
      const result = await service.createCheckout(123, '', PlanType.PRO);

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return null when API returns non-201 status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 400,
        text: async () => 'Bad Request',
      });

      const result = await service.createCheckout(
        123,
        'pro-monthly-id',
        PlanType.PRO,
      );

      expect(result).toBeNull();
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.createCheckout(
        123,
        'pro-monthly-id',
        PlanType.PRO,
      );

      expect(result).toBeNull();
    });

    it('should return null when URL is missing in response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 201,
        json: async () => ({
          data: {
            attributes: {},
          },
        }),
      });

      const result = await service.createCheckout(
        123,
        'pro-monthly-id',
        PlanType.PRO,
      );

      expect(result).toBeNull();
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully with status 200', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
      });

      const result = await service.cancelSubscription('sub-123');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.lemonsqueezy.com/v1/subscriptions/sub-123',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        }),
      );
    });

    it('should cancel subscription successfully with status 204', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 204,
      });

      const result = await service.cancelSubscription('sub-456');

      expect(result).toBe(true);
    });

    it('should return false when API key is missing', async () => {
      const serviceWithoutApiKey = new SubscriptionService({
        ...mockConfigService,
        lemonsqueezyApiKey: '',
      } as any);

      const result = await serviceWithoutApiKey.cancelSubscription('sub-123');

      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return false when subscription ID is empty', async () => {
      const result = await service.cancelSubscription('');

      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return false when API returns error status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 404,
        text: async () => 'Subscription not found',
      });

      const result = await service.cancelSubscription('sub-999');

      expect(result).toBe(false);
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.cancelSubscription('sub-123');

      expect(result).toBe(false);
    });
  });
});
