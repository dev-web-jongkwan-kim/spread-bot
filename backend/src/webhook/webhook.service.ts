import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { UserService } from '../user/user.service';
import { ConfigService } from '../config/config.service';
import { TelegramService } from '../telegram/telegram.service';
import { PlanType } from '../common/constants';
import { WebhookEvent } from '../database/entities/webhook-event.entity';
import { User } from '../database/entities/user.entity';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(WebhookEvent)
    private readonly webhookEventRepo: Repository<WebhookEvent>,
    private readonly userService: UserService,
    private readonly config: ConfigService,
    private readonly telegramService: TelegramService,
  ) {}

  async handleLemonSqueezyWebhook(eventName: string, payload: any) {
    this.logger.log(`Lemon Squeezy webhook: ${eventName}`);

    const subscriptionId = payload.data?.id;
    let webhookEvent: WebhookEvent | undefined;

    // Log webhook event - start
    try {
      webhookEvent = this.webhookEventRepo.create({
        eventName,
        subscriptionId: subscriptionId || null,
        payload,
        status: 'processing',
      });
      await this.webhookEventRepo.save(webhookEvent);
    } catch (logError) {
      this.logger.error(`Failed to log webhook event: ${logError.message}`);
      // Continue processing even if logging fails
    }

    try {
      if (!subscriptionId) {
        this.logger.error('❌ No subscription ID in webhook payload', { payload });
        if (webhookEvent) {
          webhookEvent.status = 'failed';
          webhookEvent.errorMessage = 'Missing subscription ID';
          await this.webhookEventRepo.save(webhookEvent);
        }
        throw new BadRequestException('Invalid webhook payload: missing subscription ID');
      }

      const user = await this.userService.getBySubscriptionId(subscriptionId);
      if (!user) {
        this.logger.error(`❌ User not found for subscription: ${subscriptionId}`);
        if (webhookEvent) {
          webhookEvent.status = 'failed';
          webhookEvent.errorMessage = `User not found for subscription ${subscriptionId}`;
          await this.webhookEventRepo.save(webhookEvent);
        }
        // 실제 에러 - 결제했지만 사용자 없음, 재시도 필요
        throw new InternalServerErrorException(
          `User not found for subscription ${subscriptionId} - manual intervention required`
        );
      }

      // Update webhook event with user ID
      if (webhookEvent) {
        webhookEvent.userId = user.id;
        await this.webhookEventRepo.save(webhookEvent);
      }

      // Use transaction for all webhook operations to ensure atomicity
      await this.dataSource.transaction(async (manager) => {
        switch (eventName) {
          case 'subscription_created':
          case 'subscription_updated':
          case 'subscription_resumed':
            await this.handleSubscriptionActive(payload, user.id, manager);
            break;
          case 'subscription_cancelled':
          case 'subscription_expired':
          case 'subscription_paused':
            await this.handleSubscriptionInactive(payload, user.id, manager);
            break;
          case 'subscription_payment_failed':
            await this.handlePaymentFailed(payload, user, manager);
            break;
          default:
            this.logger.warn(`Unknown event: ${eventName}`);
        }
      });

      // Mark as successful
      if (webhookEvent) {
        webhookEvent.status = 'success';
        await this.webhookEventRepo.save(webhookEvent);
      }

      this.logger.log(`✅ Webhook processed: ${eventName} for user ${user.id}`);
    } catch (error) {
      this.logger.error(`❌ Webhook processing failed: ${error.message}`, error.stack);

      // Update webhook event status
      if (webhookEvent) {
        webhookEvent.status = 'failed';
        webhookEvent.errorMessage = error.message;
        await this.webhookEventRepo.save(webhookEvent);
      }

      // Re-throw known exceptions as-is (validation errors, etc.)
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }

      // Wrap unexpected errors
      throw new InternalServerErrorException('Webhook processing failed');
    }
  }

  private async handleSubscriptionActive(payload: any, userId: string, manager: EntityManager) {
    const subscriptionId = payload.data?.id;
    const attributes = payload.data?.attributes;
    const variantId = String(attributes?.variant_id);

    let plan = PlanType.BASIC;

    // Check all variant IDs (monthly and yearly)
    const proMonthly = this.config.lsVariantProMonthly;
    const proYearly = this.config.lsVariantProYearly;
    const whaleMonthly = this.config.lsVariantWhaleMonthly;
    const whaleYearly = this.config.lsVariantWhaleYearly;

    if (variantId === proMonthly || variantId === proYearly) {
      plan = PlanType.PRO;
    } else if (variantId === whaleMonthly || variantId === whaleYearly) {
      plan = PlanType.WHALE;
    }

    this.logger.log(`💳 Activating subscription: ${subscriptionId} → ${plan}`);

    // Use transaction manager for atomic update
    await manager.update(User, userId, {
      plan,
      lsSubscriptionId: subscriptionId,
      lsSubscriptionStatus: attributes?.status,
      lsCurrentPeriodEnd: attributes?.ends_at
        ? new Date(attributes.ends_at)
        : null,
    });

    this.logger.log(`✅ User ${userId} plan updated to ${plan}`);
  }

  private async handleSubscriptionInactive(payload: any, userId: string, manager: EntityManager) {
    const subscriptionId = payload.data?.id;
    const status = payload.data?.attributes?.status;

    this.logger.log(`⚠️ Deactivating subscription: ${subscriptionId} (${status})`);

    // Use transaction manager for atomic update
    await manager.update(User, userId, {
      plan: PlanType.FREE,
      lsSubscriptionId: null,
      lsSubscriptionStatus: status,
      lsCurrentPeriodEnd: null,
    });

    this.logger.log(`✅ User ${userId} downgraded to FREE`);
  }

  private async handlePaymentFailed(payload: any, user: any, manager: EntityManager) {
    const subscriptionId = payload.data?.id;
    const status = payload.data?.attributes?.status;

    this.logger.error(`💳 Payment failed for subscription: ${subscriptionId}`);

    // 결제 실패 횟수 증가
    const failureCount = (user.paymentFailureCount || 0) + 1;
    const now = new Date();

    // 3회 미만 실패: 유예 기간 (7일)
    if (failureCount < 3) {
      const gracePeriodEnds = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Use transaction manager for atomic update
      await manager.update(User, user.id, {
        paymentFailedAt: now,
        gracePeriodEndsAt: gracePeriodEnds,
        paymentFailureCount: failureCount,
      });

      // 사용자에게 텔레그램 메시지 전송
      try {
        await this.telegramService.sendMessage(
          user.telegramId,
          `⚠️ 결제가 실패했습니다 (${failureCount}/3회).\n\n` +
          '카드 정보를 확인하고 LemonSqueezy 대시보드에서 결제 방법을 업데이트해주세요.\n\n' +
          `유예 기간: ${gracePeriodEnds.toLocaleDateString('ko-KR')}\n` +
          '3회 결제 실패 시 플랜이 FREE로 다운그레이드됩니다.'
        );
        this.logger.log(`📨 Payment failure warning sent to user ${user.id} (attempt ${failureCount}/3)`);
      } catch (error) {
        this.logger.error(`Failed to send Telegram notification: ${error.message}`);
      }

      this.logger.warn(`⚠️ User ${user.id} payment failed (${failureCount}/3), grace period until ${gracePeriodEnds.toISOString()}`);
    } else {
      // 3회 이상 실패: 즉시 다운그레이드
      try {
        await this.telegramService.sendMessage(
          user.telegramId,
          '❌ 결제가 3회 실패하여 플랜이 FREE로 다운그레이드되었습니다.\n\n' +
          'LemonSqueezy 대시보드에서 결제 방법을 업데이트한 후 다시 구독해주세요.'
        );
        this.logger.log(`📨 Downgrade notification sent to user ${user.id}`);
      } catch (error) {
        this.logger.error(`Failed to send Telegram notification: ${error.message}`);
      }

      await this.handleSubscriptionInactive(payload, user.id, manager);

      // 실패 카운트 리셋 - Use transaction manager
      await manager.update(User, user.id, {
        paymentFailureCount: 0,
        paymentFailedAt: null,
        gracePeriodEndsAt: null,
      });

      this.logger.error(`❌ User ${user.id} downgraded to FREE after 3 payment failures`);
    }
  }
}


