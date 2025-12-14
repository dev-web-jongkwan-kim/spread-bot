import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { ConfigService } from '../config/config.service';
import * as crypto from 'crypto';

@Controller('webhook')
export class WebhookController {
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
      throw new Error('Missing signature');
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', this.config.lemonsqueezyWebhookSecret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      throw new Error('Invalid signature');
    }

    const eventName = body.meta?.event_name;
    if (eventName) {
      await this.webhookService.handleLemonSqueezyWebhook(eventName, body);
    }

    return { received: true };
  }
}


