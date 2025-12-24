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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(`${this.apiBase}/checkouts`, {
          method: 'POST',
          headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

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
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.error('Checkout creation timeout after 10 seconds');
      } else {
        this.logger.error(`Checkout creation error: ${error}`);
      }
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        // Lemon Squeezy API를 통해 구독 취소
        const response = await fetch(`${this.apiBase}/subscriptions/${subscriptionId}`, {
          method: 'DELETE',
          headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 200 || response.status === 204) {
          this.logger.log(`Subscription ${subscriptionId} cancelled successfully`);
          return true;
        } else {
          const errorText = await response.text();
          this.logger.error(`Subscription cancellation failed: ${response.status} - ${errorText}`);
          return false;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.error(`Subscription cancellation timeout after 10 seconds`);
      } else {
        this.logger.error(`Subscription cancellation error: ${error}`);
      }
      return false;
    }
  }

  async changePlan(
    subscriptionId: string,
    newPlan: PlanType,
    yearly: boolean,
  ): Promise<boolean> {
    const apiKey = this.config.lemonsqueezyApiKey;
    const newVariantId = this.getVariantId(newPlan, yearly);

    if (!apiKey || !subscriptionId || !newVariantId) {
      this.logger.warn('Lemon Squeezy configuration missing, subscription ID or variant ID not provided');
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const payload = {
          data: {
            type: 'subscriptions',
            id: subscriptionId,
            attributes: {
              variant_id: newVariantId,
            },
          },
        };

        // Update subscription variant
        const response = await fetch(`${this.apiBase}/subscriptions/${subscriptionId}`, {
          method: 'PATCH',
          headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 200) {
          this.logger.log(`Subscription ${subscriptionId} changed to plan ${newPlan} (${yearly ? 'yearly' : 'monthly'})`);
          return true;
        } else {
          const errorText = await response.text();
          this.logger.error(`Subscription plan change failed: ${response.status} - ${errorText}`);
          return false;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.error(`Subscription plan change timeout after 10 seconds`);
      } else {
        this.logger.error(`Subscription plan change error: ${error}`);
      }
      return false;
    }
  }

  async getInvoices(subscriptionId: string): Promise<any[] | null> {
    const apiKey = this.config.lemonsqueezyApiKey;

    if (!apiKey || !subscriptionId) {
      this.logger.warn('Lemon Squeezy configuration missing or subscription ID not provided');
      return null;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        // Fetch subscription invoices
        const response = await fetch(
          `${this.apiBase}/subscription-invoices?filter[subscription_id]=${subscriptionId}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/vnd.api+json',
              Authorization: `Bearer ${apiKey}`,
            },
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        if (response.status === 200) {
          const data = await response.json();
          const invoices = data.data?.map((invoice: any) => ({
            id: invoice.id,
            status: invoice.attributes.status,
            total: invoice.attributes.total,
            currency: invoice.attributes.currency,
            billingReason: invoice.attributes.billing_reason,
            createdAt: invoice.attributes.created_at,
            updatedAt: invoice.attributes.updated_at,
            urls: invoice.attributes.urls,
          })) || [];

          return invoices;
        } else {
          const errorText = await response.text();
          this.logger.error(`Failed to fetch invoices: ${response.status} - ${errorText}`);
          return null;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.error(`Fetch invoices timeout after 10 seconds`);
      } else {
        this.logger.error(`Fetch invoices error: ${error}`);
      }
      return null;
    }
  }
}


