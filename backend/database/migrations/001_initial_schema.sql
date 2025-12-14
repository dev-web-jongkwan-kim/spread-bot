-- ============================================
-- CryptoSpreadBot Database Schema
-- PostgreSQL 15+
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT NOT NULL UNIQUE,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    language VARCHAR(5) NOT NULL DEFAULT 'en',
    
    -- Plan & Subscription
    plan VARCHAR(20) NOT NULL DEFAULT 'free' 
        CHECK (plan IN ('free', 'basic', 'pro', 'whale')),
    
    -- Alert Settings
    threshold DECIMAL(5, 2) NOT NULL DEFAULT 1.00 
        CHECK (threshold >= 0.1 AND threshold <= 10.0),
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    muted_until TIMESTAMP WITH TIME ZONE,
    
    -- Daily Alert Tracking
    daily_alerts_sent INTEGER NOT NULL DEFAULT 0,
    alerts_reset_at DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Lemon Squeezy Integration
    ls_customer_id VARCHAR(255),
    ls_subscription_id VARCHAR(255),
    ls_subscription_status VARCHAR(50),  -- active, cancelled, expired, paused
    ls_current_period_end TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT users_telegram_id_unique UNIQUE (telegram_id)
);

-- Index for telegram_id lookup (가장 빈번한 쿼리)
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_plan ON users(plan);
CREATE INDEX idx_users_ls_customer_id ON users(ls_customer_id) WHERE ls_customer_id IS NOT NULL;


-- ============================================
-- USER_COINS TABLE (사용자가 모니터링하는 코인)
-- ============================================
CREATE TABLE user_coins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,  -- BTC, ETH, SOL 등
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 중복 방지
    CONSTRAINT user_coins_unique UNIQUE (user_id, symbol)
);

CREATE INDEX idx_user_coins_user_id ON user_coins(user_id);
CREATE INDEX idx_user_coins_symbol ON user_coins(symbol);
CREATE INDEX idx_user_coins_active ON user_coins(user_id, is_active) WHERE is_active = TRUE;


-- ============================================
-- USER_EXCHANGES TABLE (사용자가 선택한 거래소)
-- ============================================
CREATE TABLE user_exchanges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange_id VARCHAR(50) NOT NULL,  -- binance, coinbase, kraken 등
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 중복 방지
    CONSTRAINT user_exchanges_unique UNIQUE (user_id, exchange_id)
);

CREATE INDEX idx_user_exchanges_user_id ON user_exchanges(user_id);
CREATE INDEX idx_user_exchanges_active ON user_exchanges(user_id, is_active) WHERE is_active = TRUE;


-- ============================================
-- ALERTS TABLE (발송된 알림 히스토리)
-- ============================================
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Alert Content
    symbol VARCHAR(20) NOT NULL,
    spread_percent DECIMAL(6, 3) NOT NULL,
    buy_exchange VARCHAR(50) NOT NULL,
    buy_price DECIMAL(20, 8) NOT NULL,
    sell_exchange VARCHAR(50) NOT NULL,
    sell_price DECIMAL(20, 8) NOT NULL,
    potential_profit DECIMAL(20, 8),  -- sell_price - buy_price
    
    -- Tracking
    was_clicked BOOLEAN NOT NULL DEFAULT FALSE,  -- 사용자가 링크 클릭했는지
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alerts_user_symbol ON alerts(user_id, symbol, created_at DESC);


-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Users 테이블에 트리거 적용
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Daily alerts reset 함수 (매일 자정에 cron으로 실행)
CREATE OR REPLACE FUNCTION reset_daily_alerts()
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET daily_alerts_sent = 0, 
        alerts_reset_at = CURRENT_DATE
    WHERE alerts_reset_at < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;


