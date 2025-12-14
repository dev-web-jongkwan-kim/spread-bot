import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { PlanType } from '../common/constants';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly apiBase = 'https://api.lemonsqueezy.com/v1';

  constructor(private readonly config: ConfigService) {}

  getVariantId(plan: PlanType, yearly: boolean): string {
    if (plan === PlanType.BASIC) {
      return yearly
        ? this.config.lsVariantBasicYearly
        : this.config.lsVariantBasicMonthly;
    }
    if (plan === PlanType.PRO) {
      return yearly
        ? this.config.lsVariantProYearly
        : this.config.lsVariantProMonthly;
    }
    if (plan === PlanType.WHALE) {
      return yearly
        ? this.config.lsVariantWhaleYearly
        : this.config.lsVariantWhaleMonthly;
    }
    return '';
  }

  async createCheckout(
    telegramId: number,
    variantId: string,
    plan: PlanType,
  ): Promise<string | null> {
    const apiKey = this.config.lemonsqueezyApiKey;
    const storeId = this.config.lemonsqueezyStoreId;

    if (!apiKey || !storeId || !variantId) {
      this.logger.warn(
        'Lemon Squeezy configuration missing. Cannot create checkout.',
      );
      return null;
    }

    const botUsername = this.config.telegramBotToken.split(':')[0];

    const payload = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            custom: {
              telegram_id: String(telegramId),
              plan: plan,
            },
          },
          product_options: {
            redirect_url: `https://t.me/${botUsername}?start=payment_success`,
          },
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: storeId,
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: variantId,
            },
          },
        },
      },
    };

    try {
      const response = await fetch(`${this.apiBase}/checkouts`, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 201) {
        const data = await response.json();
        return data.data?.attributes?.url || null;
      } else {
        const errorText = await response.text();
        this.logger.error(
          `Checkout creation failed: ${response.status} - ${errorText}`,
        );
        return null;
      }
    } catch (error) {
      this.logger.error(`Checkout creation error: ${error}`);
      return null;
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    const apiKey = this.config.lemonsqueezyApiKey;

    if (!apiKey || !subscriptionId) {
      this.logger.warn('Lemon Squeezy configuration missing or subscription ID not provided');
      return false;
    }

    try {
      // Lemon Squeezy API를 통해 구독 취소
      const response = await fetch(`${this.apiBase}/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.status === 200 || response.status === 204) {
        this.logger.log(`Subscription ${subscriptionId} cancelled successfully`);
        return true;
      } else {
        const errorText = await response.text();
        this.logger.error(`Subscription cancellation failed: ${response.status} - ${errorText}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Subscription cancellation error: ${error}`);
      return false;
    }
  }
}


