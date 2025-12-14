export interface User {
  id: string
  telegram_id: number
  username?: string
  first_name?: string
  last_name?: string
  language: string
  plan: 'free' | 'basic' | 'pro' | 'whale'
  role: 'user' | 'admin'
  threshold: number
  is_muted: boolean
  muted_until?: string
  daily_alerts_sent: number
  coins: string[]
  exchanges: string[]
  ls_subscription_status?: string
  created_at: string
}

export interface Coin {
  symbol: string
  price?: number
  change_24h?: number
  threshold?: number | null
}

export interface Exchange {
  id: string
  name: string
  emoji: string
  is_active: boolean
}

export interface Alert {
  id: string
  symbol: string
  spread_percent: number
  buy_exchange: string
  buy_price: number
  sell_exchange: string
  sell_price: number
  potential_profit: number
  created_at: string
  was_clicked: boolean
}

export interface PriceComparison {
  symbol: string
  prices: Record<string, number>
  min_price: number
  max_price: number
  min_exchange: string
  max_exchange: string
  spread_percent: number
  timestamp: string
}

export interface ExchangePrice {
  exchange: string
  price: number | null
  deviation_percent: number | null
  not_supported?: boolean
}

export interface CoinPriceData {
  symbol: string
  prices: ExchangePrice[]
  spread_percent: number
  min_price: number
  max_price: number
  min_exchange: string | null
  max_exchange: string | null
  avg_price: number
  timestamp: string
  invalid_symbol?: boolean // Flag indicating the symbol doesn't exist on any exchange
}

export interface PricesResponse {
  coins: CoinPriceData[]
}

export interface PlanLimits {
  max_coins: number
  max_exchanges: number
  daily_alerts: number
  has_history: boolean
  has_custom_threshold: boolean
  has_api_access: boolean
  priority_alerts: boolean
}

// Unified Symbol types for 200 supported symbols
export interface UnifiedSymbolExchangeMapping {
  symbol: string
  tradingPair: string
  multiplier: number
  isActive: boolean
}

export interface UnifiedSymbol {
  id: string
  symbol: string
  name: string
  category: string | null
  rank: number | null
  exchanges: Record<string, UnifiedSymbolExchangeMapping>
}

export interface UnifiedSymbolsResponse {
  symbols: UnifiedSymbol[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// Categories for unified symbols
export type SymbolCategory = 
  | 'layer-1'
  | 'layer-2'
  | 'defi'
  | 'meme'
  | 'gaming'
  | 'metaverse'
  | 'nft'
  | 'ai'
  | 'oracle'
  | 'stablecoin'
  | 'bridge'
  | 'infrastructure'
  | 'payment'
  | 'privacy'
  | 'storage'
  | 'exchange'
  | 'interoperability'
  | 'rwa'
  | 'depin'
  | 'ai-computing'




