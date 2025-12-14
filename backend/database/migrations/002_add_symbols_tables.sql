-- ============================================
-- Symbols Management Tables
-- ============================================

-- SYMBOLS TABLE (바이낸스 기준 심볼명)
CREATE TABLE symbols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(20) NOT NULL UNIQUE,  -- 바이낸스 기준 심볼명 (BTC, ETH, SOL 등)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_symbols_symbol ON symbols(symbol);
CREATE INDEX idx_symbols_active ON symbols(is_active) WHERE is_active = TRUE;

-- EXCHANGE_SYMBOLS TABLE (거래소별 심볼 매핑)
CREATE TABLE exchange_symbols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol_id UUID NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
    exchange_id VARCHAR(50) NOT NULL,  -- binance, coinbase, kraken 등
    exchange_symbol VARCHAR(50) NOT NULL,  -- 해당 거래소에서 사용하는 심볼명
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 중복 방지: 같은 거래소에 같은 심볼은 하나만
    CONSTRAINT exchange_symbols_unique UNIQUE (symbol_id, exchange_id)
);

CREATE INDEX idx_exchange_symbols_symbol_id ON exchange_symbols(symbol_id);
CREATE INDEX idx_exchange_symbols_exchange_id ON exchange_symbols(exchange_id);
CREATE INDEX idx_exchange_symbols_exchange_symbol ON exchange_symbols(exchange_symbol);
CREATE INDEX idx_exchange_symbols_active ON exchange_symbols(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_exchange_symbols_lookup ON exchange_symbols(exchange_id, exchange_symbol, is_active);

-- Updated_at 트리거 적용
CREATE TRIGGER update_symbols_updated_at
    BEFORE UPDATE ON symbols
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchange_symbols_updated_at
    BEFORE UPDATE ON exchange_symbols
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

