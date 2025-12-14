// User Roles
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

// Plan Types
export enum PlanType {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  WHALE = 'whale',
}

export interface PlanLimits {
  maxCoins: number;
  maxExchanges: number;
  dailyAlerts: number; // -1 = unlimited
  hasHistory: boolean;
  hasCustomThreshold: boolean;
  hasApiAccess: boolean;
  priorityAlerts: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  [PlanType.FREE]: {
    maxCoins: 1,
    maxExchanges: 3,
    dailyAlerts: 5,
    hasHistory: false,
    hasCustomThreshold: false,
    hasApiAccess: false,
    priorityAlerts: false,
  },
  [PlanType.BASIC]: {
    maxCoins: 5,
    maxExchanges: 5,
    dailyAlerts: -1,
    hasHistory: true,
    hasCustomThreshold: false,
    hasApiAccess: false,
    priorityAlerts: false,
  },
  [PlanType.PRO]: {
    maxCoins: -1,
    maxExchanges: 10,
    dailyAlerts: -1,
    hasHistory: true,
    hasCustomThreshold: true,
    hasApiAccess: false,
    priorityAlerts: true,
  },
  [PlanType.WHALE]: {
    maxCoins: -1,
    maxExchanges: -1,
    dailyAlerts: -1,
    hasHistory: true,
    hasCustomThreshold: true,
    hasApiAccess: true,
    priorityAlerts: true,
  },
};

// Exchange Info
export interface ExchangeInfo {
  id: string;
  name: string;
  emoji: string;
  hasAffiliate: boolean;
  rateLimitPerSecond: number;
}

export const SUPPORTED_EXCHANGES: Record<string, ExchangeInfo> = {
  binance: { id: 'binance', name: 'Binance', emoji: '🟡', hasAffiliate: true, rateLimitPerSecond: 20 },
  coinbase: { id: 'coinbase', name: 'Coinbase', emoji: '🔵', hasAffiliate: true, rateLimitPerSecond: 10 },
  kraken: { id: 'kraken', name: 'Kraken', emoji: '🟣', hasAffiliate: true, rateLimitPerSecond: 15 },
  okx: { id: 'okx', name: 'OKX', emoji: '⚫', hasAffiliate: true, rateLimitPerSecond: 10 },
  bybit: { id: 'bybit', name: 'Bybit', emoji: '🟠', hasAffiliate: true, rateLimitPerSecond: 50 },
  kucoin: { id: 'kucoin', name: 'KuCoin', emoji: '🟢', hasAffiliate: true, rateLimitPerSecond: 30 },
  gateio: { id: 'gateio', name: 'Gate.io', emoji: '🔴', hasAffiliate: true, rateLimitPerSecond: 50 },
  huobi: { id: 'huobi', name: 'Huobi', emoji: '🔷', hasAffiliate: true, rateLimitPerSecond: 10 },
};

export const MVP_EXCHANGES: string[] = [
  'binance',
  'coinbase',
  'kraken',
  'okx',
  'bybit',
  'kucoin',
  'gateio',
  'huobi',
];

// Popular Coins
export const POPULAR_COINS: string[] = [
  'BTC',
  'ETH',
  'SOL',
  'XRP',
  'DOGE',
  'ADA',
  'AVAX',
  'LINK',
  'DOT',
  'MATIC',
];

export const QUOTE_CURRENCY = 'USDT';

// Thresholds
export const PRESET_THRESHOLDS: number[] = [0.5, 1.0, 1.5, 2.0, 3.0, 5.0];
export const MIN_THRESHOLD = 0.1;
export const MAX_THRESHOLD = 10.0;
export const DEFAULT_THRESHOLD = 1.0;

// Language
export enum Language {
  EN = 'en',
  KO = 'ko',
  JA = 'ja',
  ZH = 'zh',
}

export const DEFAULT_LANGUAGE = Language.EN;

export const LANGUAGE_NAMES: Record<Language, string> = {
  [Language.EN]: '🇺🇸 English',
  [Language.KO]: '🇰🇷 한국어',
  [Language.JA]: '🇯🇵 日本語',
  [Language.ZH]: '🇨🇳 中文',
};

// Callback Prefixes
export class CallbackPrefix {
  static LANGUAGE = 'lang:';
  static ADD_COIN = 'add_coin:';
  static REMOVE_COIN = 'rm_coin:';
  static TOGGLE_EXCHANGE = 'toggle_ex:';
  static SET_THRESHOLD = 'threshold:';
  static CUSTOM_THRESHOLD = 'custom_th';
  static UPGRADE_PLAN = 'upgrade:';
  static CONFIRM_UPGRADE = 'confirm_up:';
  static MUTE = 'mute:';
  static UNMUTE = 'unmute';
  static BACK = 'back:';
  static CANCEL = 'cancel';
  static PAGE = 'page:';
}



