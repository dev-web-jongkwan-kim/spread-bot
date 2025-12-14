import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from '../database/entities/alert.entity';
import { User } from '../database/entities/user.entity';
import { UserRepository } from '../user/user.repository';
import { CacheService } from '../cache/cache.service';
import { ConfigService } from '../config/config.service';
import { ExchangeService, SpreadResult } from '../exchange/exchange.service';
import { UserService } from '../user/user.service';
import { SUPPORTED_EXCHANGES } from '../common/constants';
import { Telegraf } from 'telegraf';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private bot: Telegraf | null = null;

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    private readonly userRepo: UserRepository,
    private readonly userService: UserService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
    private readonly exchangeService: ExchangeService,
    private readonly queueService: QueueService,
  ) {}

  setBot(bot: Telegraf) {
    this.bot = bot;
  }

  async checkAndSendAlerts(symbol: string, spread: SpreadResult) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'alert.service.ts:checkAndSendAlerts',message:'Checking alerts',data:{symbol,spreadPercent:spread.spreadPercent,buyExchange:spread.buyExchange,sellExchange:spread.sellExchange},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    const users = await this.userRepo.getUsersMonitoringSymbol(symbol, [
      spread.buyExchange,
      spread.sellExchange,
    ]);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'alert.service.ts:checkAndSendAlerts',message:'Users found for symbol',data:{symbol,userCount:users.length,userIds:users.map(u=>u.id),telegramIds:users.map(u=>u.telegramId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    this.logger.debug(`Found ${users.length} users monitoring ${symbol} with exchanges ${spread.buyExchange} and ${spread.sellExchange}`);

    for (const user of users) {
      await this.processUserAlert(user, spread);
    }
  }

  private async processUserAlert(user: User, spread: SpreadResult) {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'alert.service.ts:processUserAlert',message:'Processing user alert',data:{userId:user.id,telegramId:user.telegramId,threshold:Number(user.threshold),spreadPercent:spread.spreadPercent,plan:user.plan},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      // 1. Check muted status
      const isMuted = this.userService.isCurrentlyMuted(user);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'alert.service.ts:processUserAlert',message:'Muted check',data:{userId:user.id,isMuted,isMutedField:user.isMuted,mutedUntil:user.mutedUntil?.toISOString()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      if (isMuted) {
        this.logger.debug(`User ${user.telegramId} is muted, skipping alert`);
        return;
      }

      // 2. Check threshold (coin-specific threshold takes priority over user default)
      const userCoin = user.coins?.find((c) => c.symbol === spread.symbol && c.isActive);
      const coinThreshold = userCoin?.threshold !== null && userCoin?.threshold !== undefined 
        ? Number(userCoin.threshold) 
        : null;
      const effectiveThreshold = coinThreshold !== null ? coinThreshold : Number(user.threshold);
      const thresholdCheck = spread.spreadPercent >= effectiveThreshold;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'alert.service.ts:processUserAlert',message:'Threshold check',data:{userId:user.id,symbol:spread.symbol,spreadPercent:spread.spreadPercent,coinThreshold,userThreshold:Number(user.threshold),effectiveThreshold,thresholdCheck},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
      // #endregion
      if (!thresholdCheck) {
        this.logger.debug(`Spread ${spread.spreadPercent.toFixed(2)}% < threshold ${effectiveThreshold}% (${coinThreshold !== null ? 'coin-specific' : 'default'}) for user ${user.telegramId}`);
        return;
      }

      // 3. Check cooldown
      const cooldownCheck = await this.checkCooldown(user.id, spread);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'alert.service.ts:processUserAlert',message:'Cooldown check',data:{userId:user.id,symbol:spread.symbol,buyExchange:spread.buyExchange,sellExchange:spread.sellExchange,cooldownCheck},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'I'})}).catch(()=>{});
      // #endregion
      if (!cooldownCheck) {
        this.logger.debug(`User ${user.telegramId} is in cooldown for ${spread.symbol} ${spread.buyExchange}->${spread.sellExchange}`);
        return;
      }

      // 4. Check daily limit
      const canSend = this.userService.canSendAlert(user);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'alert.service.ts:processUserAlert',message:'Daily limit check',data:{userId:user.id,plan:user.plan,dailyAlertsSent:user.dailyAlertsSent,canSend},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
      // #endregion
      if (!canSend) {
        this.logger.debug(`User ${user.telegramId} has reached daily alert limit`);
        return;
      }

      // 5. Check if user selected both exchanges
      const userExchanges = user.exchanges
        ?.filter((e) => e.isActive)
        .map((e) => e.exchangeId) || [];
      const hasBuyExchange = userExchanges.includes(spread.buyExchange);
      const hasSellExchange = userExchanges.includes(spread.sellExchange);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'alert.service.ts:processUserAlert',message:'Exchange check',data:{userId:user.id,userExchanges,buyExchange:spread.buyExchange,sellExchange:spread.sellExchange,hasBuyExchange,hasSellExchange},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'K'})}).catch(()=>{});
      // #endregion
      if (!hasBuyExchange || !hasSellExchange) {
        this.logger.debug(`User ${user.telegramId} does not have both exchanges: has ${spread.buyExchange}=${hasBuyExchange}, has ${spread.sellExchange}=${hasSellExchange}`);
        return;
      }

      // All conditions passed - send alert via queue
      this.logger.log(`All checks passed for user ${user.telegramId}, queuing alert for ${spread.symbol} ${spread.spreadPercent.toFixed(2)}%`);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'alert.service.ts:processUserAlert',message:'All checks passed, queuing alert',data:{userId:user.id,telegramId:user.telegramId,symbol:spread.symbol,spreadPercent:spread.spreadPercent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'L'})}).catch(()=>{});
      // #endregion
      
      // Add to queue for async processing
      await this.queueService.addAlertJob({
        userId: user.id,
        telegramId: user.telegramId,
        symbol: spread.symbol,
        spreadPercent: spread.spreadPercent,
        buyExchange: spread.buyExchange,
        buyPrice: spread.buyPrice,
        sellExchange: spread.sellExchange,
        sellPrice: spread.sellPrice,
        potentialProfit: spread.potentialProfitPerUnit,
      });
      
      // Also send immediately (for now, queue will handle retries)
      await this.sendAlert(user, spread);
    } catch (error) {
      this.logger.error(`Error processing alert for user ${user.telegramId}: ${error.message}`);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'alert.service.ts:processUserAlert',message:'Error processing alert',data:{userId:user.id,telegramId:user.telegramId,error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'M'})}).catch(()=>{});
      // #endregion
    }
  }

  private async checkCooldown(
    userId: string,
    spread: SpreadResult,
  ): Promise<boolean> {
    const lastAlert = await this.cache.getCooldown(
      userId,
      spread.symbol,
      spread.buyExchange,
      spread.sellExchange,
    );
    return !lastAlert;
  }

  private async setCooldown(userId: string, spread: SpreadResult) {
    await this.cache.setCooldown(
      userId,
      spread.symbol,
      spread.buyExchange,
      spread.sellExchange,
    );
  }

  private async sendAlert(user: User, spread: SpreadResult) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'alert.service.ts:sendAlert',message:'Attempting to send alert',data:{userId:user.id,telegramId:user.telegramId,symbol:spread.symbol,spreadPercent:spread.spreadPercent,hasBot:!!this.bot},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'N'})}).catch(()=>{});
    // #endregion
    
    if (!this.bot) {
      this.logger.error('Bot instance not set', { userId: user.id, telegramId: user.telegramId });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'alert.service.ts:sendAlert',message:'Bot instance not set',data:{userId:user.id,telegramId:user.telegramId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'O'})}).catch(()=>{});
      // #endregion
      return;
    }

    const message = this.formatAlertMessage(user, spread);
    const keyboard = this.createAlertKeyboard(spread);

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'alert.service.ts:sendAlert',message:'Sending telegram message',data:{userId:user.id,telegramId:user.telegramId,messageLength:message.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'P'})}).catch(()=>{});
      // #endregion
      
      await this.bot.telegram.sendMessage(user.telegramId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'alert.service.ts:sendAlert',message:'Telegram message sent successfully',data:{userId:user.id,telegramId:user.telegramId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'Q'})}).catch(()=>{});
      // #endregion

      // Set cooldown
      await this.setCooldown(user.id, spread);

      // Increment daily count
      await this.userRepo.incrementDailyAlerts(user.id);

      // Save alert record
      await this.alertRepo.save({
        userId: user.id,
        symbol: spread.symbol,
        spreadPercent: spread.spreadPercent,
        buyExchange: spread.buyExchange,
        buyPrice: spread.buyPrice,
        sellExchange: spread.sellExchange,
        sellPrice: spread.sellPrice,
        potentialProfit: spread.potentialProfitPerUnit,
      });

      this.logger.log(
        `✅ Alert sent to ${user.telegramId}: ${spread.symbol} ${spread.spreadPercent.toFixed(2)}%`,
        {
          userId: user.id,
          telegramId: user.telegramId,
          symbol: spread.symbol,
          spreadPercent: spread.spreadPercent,
          buyExchange: spread.buyExchange,
          sellExchange: spread.sellExchange,
        },
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to send alert to ${user.telegramId}: ${error.message}`,
        {
          userId: user.id,
          telegramId: user.telegramId,
          symbol: spread.symbol,
          error: error.message,
          stack: error.stack,
        },
      );
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'alert.service.ts:sendAlert',message:'Failed to send telegram message',data:{userId:user.id,telegramId:user.telegramId,error:error.message,errorStack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'R'})}).catch(()=>{});
      // #endregion
    }
  }

  private formatAlertMessage(user: User, spread: SpreadResult): string {
    const buyInfo = SUPPORTED_EXCHANGES[spread.buyExchange];
    const sellInfo = SUPPORTED_EXCHANGES[spread.sellExchange];

    const buyEmoji = buyInfo?.emoji || '🔵';
    const sellEmoji = sellInfo?.emoji || '🔵';
    const buyName = buyInfo?.name || spread.buyExchange;
    const sellName = sellInfo?.name || spread.sellExchange;

    return `
🚨 <b>${spread.symbol} SPREAD ALERT!</b>

📈 <b>Spread: ${spread.spreadPercent.toFixed(2)}%</b>

${buyEmoji} <b>BUY:</b>  ${buyName}
   └ $${spread.buyPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 })}

${sellEmoji} <b>SELL:</b> ${sellName}
   └ $${spread.sellPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 })}

💸 <b>Potential:</b> $${spread.potentialProfitPerUnit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 })} per ${spread.symbol}

⏰ ${spread.timestamp.toISOString().replace('T', ' ').substring(0, 19)} UTC
`.trim();
  }

  private createAlertKeyboard(spread: SpreadResult) {
    const buyUrl = this.config.getAffiliateUrl(spread.buyExchange, spread.symbol);
    const sellUrl = this.config.getAffiliateUrl(spread.sellExchange, spread.symbol);

    const buyInfo = SUPPORTED_EXCHANGES[spread.buyExchange];
    const sellInfo = SUPPORTED_EXCHANGES[spread.sellExchange];
    const buyName = buyInfo?.name || spread.buyExchange;
    const sellName = sellInfo?.name || spread.sellExchange;

    return {
      inline_keyboard: [
        [{ text: `Buy on ${buyName} →`, url: buyUrl }],
        [{ text: `Sell on ${sellName} →`, url: sellUrl }],
      ],
    };
  }
}



