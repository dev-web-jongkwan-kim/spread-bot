import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { AlertService } from '../alert/alert.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    @InjectBot() public readonly bot: Telegraf,
    private readonly alertService: AlertService,
  ) {}

  async onModuleInit() {
    try {
      
      // Bot이 유효한지 확인
      const botInfo = await this.bot.telegram.getMe();
      
      this.alertService.setBot(this.bot);
      
      this.logger.log('Telegram bot initialized');
    } catch (error: any) {
      this.logger.warn(`Telegram bot initialization failed: ${error.message}`);
      this.logger.warn('Telegram bot features will be disabled');
    }
  }

  async setWebhook(url: string, secretToken?: string) {
    await this.bot.telegram.setWebhook(url, {
      secret_token: secretToken,
    });
    this.logger.log(`Webhook set: ${url}`);
  }

  async deleteWebhook() {
    await this.bot.telegram.deleteWebhook();
    this.logger.log('Webhook deleted');
  }

  async sendMessage(chatId: number, text: string, options?: any) {
    try {
      await this.bot.telegram.sendMessage(chatId, text, options);
      this.logger.log(`Message sent to ${chatId}`);
    } catch (error: any) {
      this.logger.error(`Failed to send message to ${chatId}: ${error.message}`);
      throw error;
    }
  }
}


