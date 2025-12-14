import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { PlanType } from '../common/constants';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly userService: UserService) {}

  async handleLemonSqueezyWebhook(eventName: string, payload: any) {
    this.logger.log(`Lemon Squeezy webhook: ${eventName}`);

    const subscriptionId = payload.data?.id;
    if (!subscriptionId) {
      this.logger.warn('No subscription ID in webhook payload');
      return;
    }

    const user = await this.userService.getBySubscriptionId(subscriptionId);
    if (!user) {
      this.logger.warn(`User not found for subscription: ${subscriptionId}`);
      return;
    }

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_resumed':
        await this.handleSubscriptionActive(payload, user.id);
        break;
      case 'subscription_cancelled':
      case 'subscription_expired':
      case 'subscription_paused':
        await this.handleSubscriptionInactive(payload, user.id);
        break;
      default:
        this.logger.debug(`Unhandled event: ${eventName}`);
    }
  }

  private async handleSubscriptionActive(payload: any, userId: string) {
    const attributes = payload.data?.attributes;
    const variantId = attributes?.variant_id;

    let plan = PlanType.BASIC;
    if (variantId === this.getVariantId(PlanType.PRO, false)) {
      plan = PlanType.PRO;
    } else if (variantId === this.getVariantId(PlanType.WHALE, false)) {
      plan = PlanType.WHALE;
    }

    await this.userService.update(userId, {
      plan,
      lsSubscriptionStatus: attributes?.status,
      lsCurrentPeriodEnd: attributes?.ends_at
        ? new Date(attributes.ends_at)
        : null,
    });

    this.logger.log(`User ${userId} plan updated to ${plan}`);
  }

  private async handleSubscriptionInactive(payload: any, userId: string) {
    await this.userService.update(userId, {
      plan: PlanType.FREE,
      lsSubscriptionStatus: payload.data?.attributes?.status,
      lsCurrentPeriodEnd: null,
    });

    this.logger.log(`User ${userId} plan downgraded to FREE`);
  }

  private getVariantId(plan: PlanType, yearly: boolean): string {
    // This should match your Lemon Squeezy variant IDs
    // You'll need to implement this based on your actual variant IDs
    return '';
  }
}


