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
    
    const users = await this.userRepo.getUsersMonitoringSymbol(symbol, [
      spread.buyExchange,
      spread.sellExchange,
    ]);


    this.logger.debug(`Found ${users.length} users monitoring ${symbol} with exchanges ${spread.buyExchange} and ${spread.sellExchange}`);

    for (const user of users) {
      await this.processUserAlert(user, spread);
    }
  }

  private async processUserAlert(user: User, spread: SpreadResult) {
    try {
      
      // 1. Check muted status
      const isMuted = this.userService.isCurrentlyMuted(user);
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
      if (!thresholdCheck) {
        this.logger.debug(`Spread ${spread.spreadPercent.toFixed(2)}% < threshold ${effectiveThreshold}% (${coinThreshold !== null ? 'coin-specific' : 'default'}) for user ${user.telegramId}`);
        return;
      }

      // 3. Check and set cooldown atomically (prevents race conditions)
      const canSendAlert = await this.cache.checkAndSetCooldown(
        user.id,
        spread.symbol,
        spread.buyExchange,
        spread.sellExchange,
      );
      if (!canSendAlert) {
        this.logger.debug(`User ${user.telegramId} is in cooldown for ${spread.symbol} ${spread.buyExchange}->${spread.sellExchange}`);
        return;
      }

      // 4. Check daily limit
      const canSend = this.userService.canSendAlert(user);
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
      if (!hasBuyExchange || !hasSellExchange) {
        this.logger.debug(`User ${user.telegramId} does not have both exchanges: has ${spread.buyExchange}=${hasBuyExchange}, has ${spread.sellExchange}=${hasSellExchange}`);
        return;
      }

      // All conditions passed - send alert via queue
      this.logger.log(`All checks passed for user ${user.telegramId}, queuing alert for ${spread.symbol} ${spread.spreadPercent.toFixed(2)}%`);
      
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
    
    if (!this.bot) {
      this.logger.error('Bot instance not set', { userId: user.id, telegramId: user.telegramId });
      return;
    }

    const message = this.formatAlertMessage(user, spread);
    const keyboard = this.createAlertKeyboard(spread);

    try {
      
      await this.bot.telegram.sendMessage(user.telegramId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });

      // Cooldown already set atomically in checkAndSetCooldown()
      // No need to set again here

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



