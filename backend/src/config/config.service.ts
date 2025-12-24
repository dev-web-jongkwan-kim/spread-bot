import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  // Application
  get appEnv(): string {
    return this.configService.get<string>('APP_ENV', 'development');
  }

  get appDebug(): boolean {
    return this.configService.get<boolean>('APP_DEBUG', false);
  }

  get logLevel(): string {
    return this.configService.get<string>('LOG_LEVEL', 'INFO');
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3033);
  }

  get frontendUrl(): string | undefined {
    return this.configService.get<string>('FRONTEND_URL');
  }

  // Telegram
  get telegramBotToken(): string {
    return this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
  }

  get telegramWebhookUrl(): string | undefined {
    return this.configService.get<string>('TELEGRAM_WEBHOOK_URL');
  }

  get telegramWebhookSecret(): string | undefined {
    return this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET');
  }

  // JWT
  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') || '';
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN', '30d');
  }

  // Admin
  get adminTelegramId(): string {
    return this.configService.get<string>('ADMIN_TELEGRAM_ID') || '';
  }

  // Database
  get databaseUrl(): string {
    return this.configService.get<string>('DATABASE_URL') || '';
  }

  get databasePoolSize(): number {
    return this.configService.get<number>('DATABASE_POOL_SIZE', 10);
  }

  get databaseMaxOverflow(): number {
    return this.configService.get<number>('DATABASE_MAX_OVERFLOW', 20);
  }

  // Redis
  get redisUrl(): string {
    return this.configService.get<string>('REDIS_URL', 'redis://localhost:6379/0');
  }

  get redisPassword(): string | undefined {
    return this.configService.get<string>('REDIS_PASSWORD');
  }

  get redisSsl(): boolean {
    return this.configService.get<boolean>('REDIS_SSL', false);
  }

  // Lemon Squeezy
  get lemonsqueezyApiKey(): string {
    return this.configService.get<string>('LEMONSQUEEZY_API_KEY') || '';
  }

  get lemonsqueezyStoreId(): string {
    return this.configService.get<string>('LEMONSQUEEZY_STORE_ID') || '';
  }

  get lemonsqueezyWebhookSecret(): string {
    return this.configService.get<string>('LEMONSQUEEZY_WEBHOOK_SECRET') || '';
  }

  // Lemon Squeezy Product Variants
  get lsVariantBasicMonthly(): string {
    return this.configService.get<string>('LS_VARIANT_BASIC_MONTHLY') || '';
  }

  get lsVariantBasicYearly(): string {
    return this.configService.get<string>('LS_VARIANT_BASIC_YEARLY') || '';
  }

  get lsVariantProMonthly(): string {
    return this.configService.get<string>('LS_VARIANT_PRO_MONTHLY') || '';
  }

  get lsVariantProYearly(): string {
    return this.configService.get<string>('LS_VARIANT_PRO_YEARLY') || '';
  }

  get lsVariantWhaleMonthly(): string {
    return this.configService.get<string>('LS_VARIANT_WHALE_MONTHLY') || '';
  }

  get lsVariantWhaleYearly(): string {
    return this.configService.get<string>('LS_VARIANT_WHALE_YEARLY') || '';
  }

  // Affiliate Codes
  getAffiliateCode(exchange: string): string {
    const codes: Record<string, string> = {
      binance: this.configService.get<string>('AFFILIATE_BINANCE', ''),
      coinbase: this.configService.get<string>('AFFILIATE_COINBASE', ''),
      kraken: this.configService.get<string>('AFFILIATE_KRAKEN', ''),
      okx: this.configService.get<string>('AFFILIATE_OKX', ''),
      bybit: this.configService.get<string>('AFFILIATE_BYBIT', ''),
      kucoin: this.configService.get<string>('AFFILIATE_KUCOIN', ''),
      gateio: this.configService.get<string>('AFFILIATE_GATEIO', ''),
      huobi: this.configService.get<string>('AFFILIATE_HUOBI', ''),
    };
    return codes[exchange.toLowerCase()] || '';
  }

  getAffiliateUrl(exchange: string, symbol: string = ''): string {
    const code = this.getAffiliateCode(exchange);
    const urls: Record<string, string> = {
      binance: `https://www.binance.com/en/register?ref=${code}`,
      coinbase: `https://www.coinbase.com/join/${code}`,
      kraken: `https://www.kraken.com/sign-up?ref=${code}`,
      okx: `https://www.okx.com/join/${code}`,
      bybit: `https://www.bybit.com/invite?ref=${code}`,
      kucoin: `https://www.kucoin.com/r/${code}`,
      gateio: `https://www.gate.io/signup/${code}`,
      huobi: `https://www.huobi.com/invite/${code}`,
    };
    return urls[exchange.toLowerCase()] || `https://${exchange}.com`;
  }

  // Price Monitoring
  get priceUpdateIntervalSeconds(): number {
    return this.configService.get<number>('PRICE_UPDATE_INTERVAL_SECONDS', 10);
  }

  get alertCooldownSeconds(): number {
    return this.configService.get<number>('ALERT_COOLDOWN_SECONDS', 300);
  }

  get maxConcurrentExchanges(): number {
    return this.configService.get<number>('MAX_CONCURRENT_EXCHANGES', 8);
  }

  get priceCacheTtlSeconds(): number {
    return this.configService.get<number>('PRICE_CACHE_TTL_SECONDS', 5);
  }

  // Monitoring
  get sentryDsn(): string | undefined {
    return this.configService.get<string>('SENTRY_DSN');
  }
}


