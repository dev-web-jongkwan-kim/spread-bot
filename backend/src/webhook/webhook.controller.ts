import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Get,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { ConfigService } from '../config/config.service';
import * as crypto from 'crypto';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly config: ConfigService,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  async telegramWebhook(@Body() body: any) {
    // Telegram webhook handling is done by TelegrafModule
    return { received: true };
  }

  @Post('lemonsqueezy')
  @HttpCode(HttpStatus.OK)
  async lemonsqueezyWebhook(
    @Body() body: any,
    @Headers('x-signature') signature: string,
  ) {
    if (!signature) {
      this.logger.error('Missing webhook signature');
      throw new UnauthorizedException('Missing signature');
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', this.config.lemonsqueezyWebhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    // Check length first to prevent timing attack on length comparison
    if (signature.length !== expectedSignature.length) {
      this.logger.error('Signature length mismatch');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Timing-safe comparison
    if (!crypto.timingSafeEqual(
      Buffer.from(signature, 'utf-8'),
      Buffer.from(expectedSignature, 'utf-8')
    )) {
      this.logger.error('Signature validation failed');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.log('✅ Webhook signature verified');

    const eventName = body.meta?.event_name;
    if (eventName) {
      await this.webhookService.handleLemonSqueezyWebhook(eventName, body);
    }

    return { received: true };
  }
}


