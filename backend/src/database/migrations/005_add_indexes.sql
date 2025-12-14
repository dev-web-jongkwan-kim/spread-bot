-- Performance indexes for better query performance

-- User queries
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Alert queries
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_user_created ON alerts(user_id, created_at DESC);

-- User coins
CREATE INDEX IF NOT EXISTS idx_user_coins_user_id ON user_coins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_coins_symbol ON user_coins(symbol);
CREATE INDEX IF NOT EXISTS idx_user_coins_active ON user_coins(user_id, is_active) WHERE is_active = true;

-- User exchanges
CREATE INDEX IF NOT EXISTS idx_user_exchanges_user_id ON user_exchanges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_exchanges_exchange ON user_exchanges(exchange_id);
CREATE INDEX IF NOT EXISTS idx_user_exchanges_active ON user_exchanges(user_id, is_active) WHERE is_active = true;

-- Symbols
CREATE INDEX IF NOT EXISTS idx_symbols_symbol ON symbols(symbol);
CREATE INDEX IF NOT EXISTS idx_symbols_active ON symbols(is_active) WHERE is_active = true;

-- Exchange symbols
CREATE INDEX IF NOT EXISTS idx_exchange_symbols_symbol_id ON exchange_symbols(symbol_id);
CREATE INDEX IF NOT EXISTS idx_exchange_symbols_exchange_id ON exchange_symbols(exchange_id);
CREATE INDEX IF NOT EXISTS idx_exchange_symbols_active ON exchange_symbols(exchange_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_exchange_symbols_symbol_exchange ON exchange_symbols(symbol_id, exchange_id);

-- Unified symbols
CREATE INDEX IF NOT EXISTS idx_unified_symbols_symbol ON unified_symbols(symbol);
CREATE INDEX IF NOT EXISTS idx_unified_symbols_coingecko_id ON unified_symbols(coingecko_id);
CREATE INDEX IF NOT EXISTS idx_unified_symbols_active ON unified_symbols(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_unified_symbols_rank ON unified_symbols(rank) WHERE rank IS NOT NULL;

-- Unified symbol exchanges
CREATE INDEX IF NOT EXISTS idx_unified_symbol_exchanges_symbol_id ON unified_symbol_exchanges(unified_symbol_id);
CREATE INDEX IF NOT EXISTS idx_unified_symbol_exchanges_exchange_id ON unified_symbol_exchanges(exchange_id);
CREATE INDEX IF NOT EXISTS idx_unified_symbol_exchanges_active ON unified_symbol_exchanges(unified_symbol_id, exchange_id, is_active) WHERE is_active = true;

