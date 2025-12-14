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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'telegram.service.ts:onModuleInit',message:'Initializing telegram bot',data:{hasBot:!!this.bot},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'X'})}).catch(()=>{});
      // #endregion
      
      // Bot이 유효한지 확인
      const botInfo = await this.bot.telegram.getMe();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'telegram.service.ts:onModuleInit',message:'Bot info retrieved',data:{botId:botInfo.id,botUsername:botInfo.username},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'Y'})}).catch(()=>{});
      // #endregion
      
      this.alertService.setBot(this.bot);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'telegram.service.ts:onModuleInit',message:'Bot set to alert service',data:{botId:botInfo.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'Z'})}).catch(()=>{});
      // #endregion
      
      this.logger.log('Telegram bot initialized');
    } catch (error: any) {
      this.logger.warn(`Telegram bot initialization failed: ${error.message}`);
      this.logger.warn('Telegram bot features will be disabled');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'telegram.service.ts:onModuleInit',message:'Bot initialization failed',data:{error:error.message,errorStack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'AA'})}).catch(()=>{});
      // #endregion
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
}


