import { Injectable, Logger } from '@nestjs/common';
import { Ctx, Start, Help, Command, On } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { UserService } from '../user/user.service';
import { AlertService } from '../alert/alert.service';
import { ExchangeService } from '../exchange/exchange.service';
import { Language, PlanType, PLAN_LIMITS, MVP_EXCHANGES } from '../common/constants';

@Injectable()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(
    private readonly userService: UserService,
    private readonly alertService: AlertService,
    private readonly exchangeService: ExchangeService,
  ) {}

  @Start()
  async startCommand(@Ctx() ctx: Context) {
    const user = ctx.from;
    if (!user) return;

    const dbUser = await this.userService.getByTelegramId(user.id);
    if (!dbUser) {
      await this.userService.createOrUpdate(user.id, {
        telegramId: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        language: Language.EN,
        plan: PlanType.FREE,
        threshold: 1.0,
      });
    }

    await ctx.reply(
      '🚀 <b>Welcome to CryptoSpreadBot!</b>\n\nI monitor crypto price differences across exchanges and alert you when arbitrage opportunities arise.',
      { parse_mode: 'HTML' },
    );
  }

  @Help()
  async helpCommand(@Ctx() ctx: Context) {
    await ctx.reply(
      '📖 <b>Commands:</b>\n\n' +
        '/start - Start the bot\n' +
        '/price [SYMBOL] - Check price\n' +
        '/coins - List your coins\n' +
        '/settings - Settings menu',
      { parse_mode: 'HTML' },
    );
  }

  @Command('price')
  async priceCommand(@Ctx() ctx: Context) {
    const message = ctx.message as any;
    const args = message?.text?.split(' ') || [];
    const symbol = args[1]?.toUpperCase();

    if (!symbol) {
      await ctx.reply('Usage: /price BTC');
      return;
    }

    try {
      const comparison = await this.exchangeService.getPriceComparison(
        symbol,
        MVP_EXCHANGES,
      );

      if (!comparison) {
        await ctx.reply(`❌ Could not fetch price for ${symbol}`);
        return;
      }

      const prices = Object.entries(comparison.prices)
        .map(([ex, price]) => `${ex}: $${Number(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 })}`)
        .join('\n');

      await ctx.reply(
        `💰 <b>${symbol} Price Comparison</b>\n\n${prices}\n\n` +
          `📊 Spread: ${comparison.spreadPercent.toFixed(2)}%`,
        { parse_mode: 'HTML' },
      );
    } catch (error: any) {
      this.logger.error(`Error in price command: ${error.message}`);
      await ctx.reply('❌ An error occurred');
    }
  }

  @Command('coins')
  async coinsCommand(@Ctx() ctx: Context) {
    const user = ctx.from;
    if (!user) {
      await ctx.reply('Please use /start first');
      return;
    }

    const dbUser = await this.userService.getByTelegramId(user.id);
    if (!dbUser) {
      await ctx.reply('Please use /start first');
      return;
    }

    const coins = dbUser.coins?.filter((c) => c.isActive).map((c) => c.symbol) || [];
    if (coins.length === 0) {
      await ctx.reply('No coins added yet. Use /start to add coins.');
      return;
    }

    await ctx.reply(`📊 Your coins: ${coins.join(', ')}`);
  }

  @Command('settings')
  async settingsCommand(@Ctx() ctx: Context) {
    const user = ctx.from;
    if (!user) {
      await ctx.reply('Please use /start first');
      return;
    }

    const dbUser = await this.userService.getByTelegramId(user.id);
    if (!dbUser) {
      await ctx.reply('Please use /start first');
      return;
    }

    const limits = PLAN_LIMITS[dbUser.plan as PlanType];
    await ctx.reply(
      `⚙️ <b>Settings</b>\n\n` +
        `Plan: ${dbUser.plan}\n` +
        `Threshold: ${dbUser.threshold}%\n` +
        `Coins: ${dbUser.coins?.filter((c) => c.isActive).length || 0}/${limits.maxCoins === -1 ? '∞' : limits.maxCoins}\n` +
        `Exchanges: ${dbUser.exchanges?.filter((e) => e.isActive).length || 0}/${limits.maxExchanges === -1 ? '∞' : limits.maxExchanges}`,
      { parse_mode: 'HTML' },
    );
  }

  @On('callback_query')
  async callbackQuery(@Ctx() ctx: Context) {
    const query = ctx.callbackQuery as any;
    const data = query?.data;

    if (query) {
      await ctx.answerCbQuery();
    }

    // Handle callbacks here
    this.logger.debug(`Callback received: ${data}`);
  }
}


