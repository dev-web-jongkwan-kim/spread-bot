-- Migration: 003_unified_symbol_mapping.sql
-- Description: Add unified symbol mapping table for cross-exchange symbol normalization

-- Unified symbols table (CoinGecko-style unified identifiers)
CREATE TABLE IF NOT EXISTS unified_symbols (
    id SERIAL PRIMARY KEY,
    unified_id VARCHAR(100) NOT NULL UNIQUE,  -- e.g., "bitcoin", "rats-ordinals"
    name VARCHAR(200) NOT NULL,               -- e.g., "Bitcoin", "RATS (Ordinals)"
    standard_symbol VARCHAR(50) NOT NULL,     -- e.g., "BTC", "RATS"
    coingecko_id VARCHAR(100),                -- CoinGecko API ID
    coinmarketcap_id INTEGER,                 -- CoinMarketCap API ID
    category VARCHAR(50),                     -- e.g., "layer-1", "meme", "defi"
    market_cap_rank INTEGER,                  -- Market cap ranking
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exchange-specific symbol mappings for unified symbols
CREATE TABLE IF NOT EXISTS unified_symbol_exchanges (
    id SERIAL PRIMARY KEY,
    unified_symbol_id INTEGER NOT NULL REFERENCES unified_symbols(id) ON DELETE CASCADE,
    exchange_id VARCHAR(50) NOT NULL,         -- e.g., "binance", "kucoin"
    exchange_symbol VARCHAR(50) NOT NULL,     -- e.g., "1000RATS", "RATS"
    trading_pair VARCHAR(100),                -- e.g., "1000RATSUSDT", "RATS-USDT"
    multiplier DECIMAL(20, 10) DEFAULT 1,     -- e.g., 1000 for 1000RATS
    is_active BOOLEAN DEFAULT true,
    last_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(unified_symbol_id, exchange_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_unified_symbols_standard_symbol ON unified_symbols(standard_symbol);
CREATE INDEX IF NOT EXISTS idx_unified_symbols_coingecko_id ON unified_symbols(coingecko_id);
CREATE INDEX IF NOT EXISTS idx_unified_symbols_active ON unified_symbols(is_active);
CREATE INDEX IF NOT EXISTS idx_unified_symbols_rank ON unified_symbols(market_cap_rank);

CREATE INDEX IF NOT EXISTS idx_unified_symbol_exchanges_unified ON unified_symbol_exchanges(unified_symbol_id);
CREATE INDEX IF NOT EXISTS idx_unified_symbol_exchanges_exchange ON unified_symbol_exchanges(exchange_id);
CREATE INDEX IF NOT EXISTS idx_unified_symbol_exchanges_symbol ON unified_symbol_exchanges(exchange_symbol);
CREATE INDEX IF NOT EXISTS idx_unified_symbol_exchanges_active ON unified_symbol_exchanges(is_active);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_unified_symbols_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_unified_symbols_updated_at ON unified_symbols;
CREATE TRIGGER trigger_unified_symbols_updated_at
    BEFORE UPDATE ON unified_symbols
    FOR EACH ROW
    EXECUTE FUNCTION update_unified_symbols_updated_at();

DROP TRIGGER IF EXISTS trigger_unified_symbol_exchanges_updated_at ON unified_symbol_exchanges;
CREATE TRIGGER trigger_unified_symbol_exchanges_updated_at
    BEFORE UPDATE ON unified_symbol_exchanges
    FOR EACH ROW
    EXECUTE FUNCTION update_unified_symbols_updated_at();

-- Insert Tier 1 & Tier 2 symbols (200 total)
INSERT INTO unified_symbols (unified_id, name, standard_symbol, category, market_cap_rank, is_active) VALUES
-- Tier 1: Top 20 (All exchanges, same symbol)
('bitcoin', 'Bitcoin', 'BTC', 'layer-1', 1, true),
('ethereum', 'Ethereum', 'ETH', 'layer-1', 2, true),
('tether', 'Tether', 'USDT', 'stablecoin', 3, true),
('binancecoin', 'BNB', 'BNB', 'exchange', 4, true),
('solana', 'Solana', 'SOL', 'layer-1', 5, true),
('ripple', 'XRP', 'XRP', 'payment', 6, true),
('usd-coin', 'USD Coin', 'USDC', 'stablecoin', 7, true),
('cardano', 'Cardano', 'ADA', 'layer-1', 8, true),
('dogecoin', 'Dogecoin', 'DOGE', 'meme', 9, true),
('tron', 'TRON', 'TRX', 'layer-1', 10, true),
('avalanche', 'Avalanche', 'AVAX', 'layer-1', 11, true),
('chainlink', 'Chainlink', 'LINK', 'oracle', 12, true),
('polkadot', 'Polkadot', 'DOT', 'layer-0', 13, true),
('polygon', 'Polygon', 'MATIC', 'layer-2', 14, true),
('litecoin', 'Litecoin', 'LTC', 'payment', 15, true),
('shiba-inu', 'Shiba Inu', 'SHIB', 'meme', 16, true),
('bitcoin-cash', 'Bitcoin Cash', 'BCH', 'payment', 17, true),
('uniswap', 'Uniswap', 'UNI', 'defi', 18, true),
('cosmos', 'Cosmos', 'ATOM', 'layer-0', 19, true),
('stellar', 'Stellar', 'XLM', 'payment', 20, true),
-- Tier 1: 21-50
('monero', 'Monero', 'XMR', 'privacy', 21, true),
('ethereum-classic', 'Ethereum Classic', 'ETC', 'layer-1', 22, true),
('okb', 'OKB', 'OKB', 'exchange', 23, true),
('hedera-hashgraph', 'Hedera', 'HBAR', 'layer-1', 24, true),
('filecoin', 'Filecoin', 'FIL', 'storage', 25, true),
('cronos', 'Cronos', 'CRO', 'layer-1', 26, true),
('lido-dao', 'Lido DAO', 'LDO', 'defi', 27, true),
('aptos', 'Aptos', 'APT', 'layer-1', 28, true),
('near', 'NEAR Protocol', 'NEAR', 'layer-1', 29, true),
('vechain', 'VeChain', 'VET', 'supply-chain', 30, true),
('arbitrum', 'Arbitrum', 'ARB', 'layer-2', 31, true),
('internet-computer', 'Internet Computer', 'ICP', 'layer-1', 32, true),
('maker', 'Maker', 'MKR', 'defi', 33, true),
('quant-network', 'Quant', 'QNT', 'interoperability', 34, true),
('optimism', 'Optimism', 'OP', 'layer-2', 35, true),
('the-graph', 'The Graph', 'GRT', 'indexing', 36, true),
('render-token', 'Render', 'RNDR', 'ai-computing', 37, true),
('injective-protocol', 'Injective', 'INJ', 'defi', 38, true),
('aave', 'Aave', 'AAVE', 'defi', 39, true),
('theta-token', 'Theta Network', 'THETA', 'streaming', 40, true),
('fantom', 'Fantom', 'FTM', 'layer-1', 41, true),
('the-sandbox', 'The Sandbox', 'SAND', 'metaverse', 42, true),
('decentraland', 'Decentraland', 'MANA', 'metaverse', 43, true),
('axie-infinity', 'Axie Infinity', 'AXS', 'gaming', 44, true),
('algorand', 'Algorand', 'ALGO', 'layer-1', 45, true),
('elrond-erd-2', 'MultiversX', 'EGLD', 'layer-1', 46, true),
('eos', 'EOS', 'EOS', 'layer-1', 47, true),
('flow', 'Flow', 'FLOW', 'layer-1', 48, true),
('tezos', 'Tezos', 'XTZ', 'layer-1', 49, true),
('sui', 'Sui', 'SUI', 'layer-1', 50, true),
-- Tier 2: 51-100
('gala', 'Gala', 'GALA', 'gaming', 51, true),
('kucoin-shares', 'KuCoin Token', 'KCS', 'exchange', 52, true),
('neo', 'Neo', 'NEO', 'layer-1', 53, true),
('klay-token', 'Klaytn', 'KLAY', 'layer-1', 54, true),
('chiliz', 'Chiliz', 'CHZ', 'fan-token', 55, true),
('curve-dao-token', 'Curve DAO', 'CRV', 'defi', 56, true),
('iota', 'IOTA', 'IOTA', 'iot', 57, true),
('zcash', 'Zcash', 'ZEC', 'privacy', 58, true),
('dash', 'Dash', 'DASH', 'payment', 59, true),
('enjincoin', 'Enjin Coin', 'ENJ', 'gaming', 60, true),
('basic-attention-token', 'Basic Attention Token', 'BAT', 'advertising', 61, true),
('loopring', 'Loopring', 'LRC', 'layer-2', 62, true),
('1inch', '1inch', '1INCH', 'defi', 63, true),
('ravencoin', 'Ravencoin', 'RVN', 'mining', 64, true),
('zilliqa', 'Zilliqa', 'ZIL', 'layer-1', 65, true),
('compound', 'Compound', 'COMP', 'defi', 66, true),
('synthetix', 'Synthetix', 'SNX', 'defi', 67, true),
('yearn-finance', 'yearn.finance', 'YFI', 'defi', 68, true),
('ankr', 'Ankr', 'ANKR', 'infrastructure', 69, true),
('sushiswap', 'SushiSwap', 'SUSHI', 'defi', 70, true),
('decred', 'Decred', 'DCR', 'governance', 71, true),
('waves', 'Waves', 'WAVES', 'layer-1', 72, true),
('qtum', 'Qtum', 'QTUM', 'layer-1', 73, true),
('celo', 'Celo', 'CELO', 'layer-1', 74, true),
('harmony', 'Harmony', 'ONE', 'layer-1', 75, true),
('omisego', 'OMG Network', 'OMG', 'layer-2', 76, true),
('icon', 'ICON', 'ICX', 'layer-1', 77, true),
('storj', 'Storj', 'STORJ', 'storage', 78, true),
('0x', '0x', 'ZRX', 'defi', 79, true),
('ontology', 'Ontology', 'ONT', 'layer-1', 80, true),
('holo', 'Holo', 'HOT', 'hosting', 81, true),
('ocean-protocol', 'Ocean Protocol', 'OCEAN', 'data', 82, true),
('reserve-rights-token', 'Reserve Rights', 'RSR', 'stablecoin', 83, true),
('balancer', 'Balancer', 'BAL', 'defi', 84, true),
('band-protocol', 'Band Protocol', 'BAND', 'oracle', 85, true),
('skale', 'SKALE', 'SKL', 'layer-2', 86, true),
('uma', 'UMA', 'UMA', 'defi', 87, true),
('numeraire', 'Numeraire', 'NMR', 'ai', 88, true),
('livepeer', 'Livepeer', 'LPT', 'streaming', 89, true),
('fetch-ai', 'Fetch.ai', 'FET', 'ai', 90, true),
('arweave', 'Arweave', 'AR', 'storage', 91, true),
('audio', 'Audius', 'AUDIO', 'music', 92, true),
('dydx', 'dYdX', 'DYDX', 'defi', 93, true),
('immutable-x', 'Immutable', 'IMX', 'gaming', 94, true),
('gmx', 'GMX', 'GMX', 'defi', 95, true),
('ssv-network', 'SSV Network', 'SSV', 'staking', 96, true),
('mask-network', 'Mask Network', 'MASK', 'social', 97, true),
('api3', 'API3', 'API3', 'oracle', 98, true),
('blur', 'Blur', 'BLUR', 'nft', 99, true),
('radix', 'Radix', 'XRD', 'layer-1', 100, true),
-- Tier 2: 101-150
('worldcoin-wld', 'Worldcoin', 'WLD', 'identity', 101, true),
('sei-network', 'Sei', 'SEI', 'layer-1', 102, true),
('celestia', 'Celestia', 'TIA', 'modular', 103, true),
('jupiter', 'Jupiter', 'JUP', 'defi', 104, true),
('pyth-network', 'Pyth Network', 'PYTH', 'oracle', 105, true),
('jito-governance-token', 'Jito', 'JTO', 'staking', 106, true),
('bonk', 'Bonk', 'BONK', 'meme', 107, true),
('pepe', 'Pepe', 'PEPE', 'meme', 108, true),
('floki', 'Floki', 'FLOKI', 'meme', 109, true),
('memecoin', 'Memecoin', 'MEME', 'meme', 110, true),
('wif', 'dogwifhat', 'WIF', 'meme', 111, true),
('bome', 'BOOK OF MEME', 'BOME', 'meme', 112, true),
('not', 'Notcoin', 'NOT', 'gaming', 113, true),
('ton', 'Toncoin', 'TON', 'layer-1', 114, true),
('kaspa', 'Kaspa', 'KAS', 'layer-1', 115, true),
('stacks', 'Stacks', 'STX', 'layer-2', 116, true),
('mina', 'Mina', 'MINA', 'layer-1', 117, true),
('conflux-token', 'Conflux', 'CFX', 'layer-1', 118, true),
('rocket-pool', 'Rocket Pool', 'RPL', 'staking', 119, true),
('frax-share', 'Frax Share', 'FXS', 'stablecoin', 120, true),
('pendle', 'Pendle', 'PENDLE', 'defi', 121, true),
('ondo-finance', 'Ondo', 'ONDO', 'rwa', 122, true),
('ethena', 'Ethena', 'ENA', 'stablecoin', 123, true),
('safe', 'Safe', 'SAFE', 'wallet', 124, true),
('wormhole', 'Wormhole', 'W', 'bridge', 125, true),
('eigenlayer', 'EigenLayer', 'EIGEN', 'restaking', 126, true),
('zkSync', 'zkSync', 'ZK', 'layer-2', 127, true),
('layerzero', 'LayerZero', 'ZRO', 'bridge', 128, true),
('io-net', 'io.net', 'IO', 'ai-computing', 129, true),
('aethir', 'Aethir', 'ATH', 'ai-computing', 130, true),
('grass', 'Grass', 'GRASS', 'depin', 131, true),
('helium', 'Helium', 'HNT', 'depin', 132, true),
('akash-network', 'Akash Network', 'AKT', 'cloud', 133, true),
('bittensor', 'Bittensor', 'TAO', 'ai', 134, true),
('singularitynet', 'SingularityNET', 'AGIX', 'ai', 135, true),
('theta-fuel', 'Theta Fuel', 'TFUEL', 'streaming', 136, true),
('illuvium', 'Illuvium', 'ILV', 'gaming', 137, true),
('stepn', 'STEPN', 'GMT', 'move-to-earn', 138, true),
('magic', 'MAGIC', 'MAGIC', 'gaming', 139, true),
('treasure', 'Treasure', 'MAGIC', 'gaming', 140, true),
('beam', 'Beam', 'BEAM', 'gaming', 141, true),
('ronin', 'Ronin', 'RON', 'gaming', 142, true),
('pixels', 'Pixels', 'PIXEL', 'gaming', 143, true),
('portal', 'Portal', 'PORTAL', 'gaming', 144, true),
('xai', 'Xai', 'XAI', 'gaming', 145, true),
('prime', 'Echelon Prime', 'PRIME', 'gaming', 146, true),
('gods-unchained', 'Gods Unchained', 'GODS', 'gaming', 147, true),
('vulcan-forged', 'Vulcan Forged', 'PYR', 'gaming', 148, true),
('merit-circle', 'Merit Circle', 'MC', 'gaming', 149, true),
('yield-guild-games', 'Yield Guild Games', 'YGG', 'gaming', 150, true),
-- Tier 2: 151-200
('superverse', 'SuperVerse', 'SUPER', 'gaming', 151, true),
('nft', 'APENFT', 'NFT', 'nft', 152, true),
('looksrare', 'LooksRare', 'LOOKS', 'nft', 153, true),
('x2y2', 'X2Y2', 'X2Y2', 'nft', 154, true),
('rarible', 'Rarible', 'RARI', 'nft', 155, true),
('apecoin', 'ApeCoin', 'APE', 'metaverse', 156, true),
('otherside', 'Otherside', 'OTHR', 'metaverse', 157, true),
('highstreet', 'Highstreet', 'HIGH', 'metaverse', 158, true),
('star-atlas', 'Star Atlas', 'ATLAS', 'metaverse', 159, true),
('wilder-world', 'Wilder World', 'WILD', 'metaverse', 160, true),
('smooth-love-potion', 'Smooth Love Potion', 'SLP', 'gaming', 161, true),
('mobox', 'MOBOX', 'MBOX', 'gaming', 162, true),
('altura', 'Altura', 'ALU', 'gaming', 163, true),
('wax', 'WAX', 'WAXP', 'nft', 164, true),
('ultra', 'Ultra', 'UOS', 'gaming', 165, true),
('iotex', 'IoTeX', 'IOTX', 'iot', 166, true),
('helium-mobile', 'Helium Mobile', 'MOBILE', 'depin', 167, true),
('render', 'Render', 'RENDER', 'ai-computing', 168, true),
('nosana', 'Nosana', 'NOS', 'ai-computing', 169, true),
('clore-ai', 'Clore.ai', 'CLORE', 'ai-computing', 170, true),
('golem', 'Golem', 'GLM', 'computing', 171, true),
('ocean', 'Ocean Protocol', 'OCEAN', 'data', 172, true),
('nkn', 'NKN', 'NKN', 'network', 173, true),
('ankr-network', 'Ankr', 'ANKR', 'infrastructure', 174, true),
('pocket-network', 'Pocket Network', 'POKT', 'infrastructure', 175, true),
('dent', 'Dent', 'DENT', 'telecom', 176, true),
('cartesi', 'Cartesi', 'CTSI', 'layer-2', 177, true),
('boba-network', 'Boba Network', 'BOBA', 'layer-2', 178, true),
('metis', 'Metis', 'METIS', 'layer-2', 179, true),
('mantle', 'Mantle', 'MNT', 'layer-2', 180, true),
('base', 'Base', 'BASE', 'layer-2', 181, true),
('scroll', 'Scroll', 'SCR', 'layer-2', 182, true),
('linea', 'Linea', 'LINEA', 'layer-2', 183, true),
('zksync-era', 'zkSync Era', 'ZK', 'layer-2', 184, true),
('starknet', 'StarkNet', 'STRK', 'layer-2', 185, true),
('blast', 'Blast', 'BLAST', 'layer-2', 186, true),
('mode', 'Mode', 'MODE', 'layer-2', 187, true),
('manta-network', 'Manta Network', 'MANTA', 'layer-2', 188, true),
('taiko', 'Taiko', 'TAIKO', 'layer-2', 189, true),
('zeta', 'ZetaChain', 'ZETA', 'interoperability', 190, true),
('axelar', 'Axelar', 'AXL', 'interoperability', 191, true),
('osmosis', 'Osmosis', 'OSMO', 'defi', 192, true),
('thorchain', 'THORChain', 'RUNE', 'defi', 193, true),
('synapse', 'Synapse', 'SYN', 'bridge', 194, true),
('stargate', 'Stargate Finance', 'STG', 'bridge', 195, true),
('across', 'Across', 'ACX', 'bridge', 196, true),
('hop', 'Hop Protocol', 'HOP', 'bridge', 197, true),
('celer-network', 'Celer Network', 'CELR', 'bridge', 198, true),
('multichain', 'Multichain', 'MULTI', 'bridge', 199, true),
('ren', 'Ren', 'REN', 'bridge', 200, true)
ON CONFLICT (unified_id) DO UPDATE SET
    name = EXCLUDED.name,
    standard_symbol = EXCLUDED.standard_symbol,
    category = EXCLUDED.category,
    market_cap_rank = EXCLUDED.market_cap_rank,
    is_active = EXCLUDED.is_active;

-- Insert exchange-specific mappings for symbols with 1000x prefix
-- Binance 1000x symbols
INSERT INTO unified_symbol_exchanges (unified_symbol_id, exchange_id, exchange_symbol, trading_pair, multiplier, is_active)
SELECT us.id, 'binance', '1000SHIB', '1000SHIBUSDT', 1000, true
FROM unified_symbols us WHERE us.unified_id = 'shiba-inu'
ON CONFLICT (unified_symbol_id, exchange_id) DO UPDATE SET
    exchange_symbol = EXCLUDED.exchange_symbol,
    trading_pair = EXCLUDED.trading_pair,
    multiplier = EXCLUDED.multiplier;

INSERT INTO unified_symbol_exchanges (unified_symbol_id, exchange_id, exchange_symbol, trading_pair, multiplier, is_active)
SELECT us.id, 'binance', '1000PEPE', '1000PEPEUSDT', 1000, true
FROM unified_symbols us WHERE us.unified_id = 'pepe'
ON CONFLICT (unified_symbol_id, exchange_id) DO UPDATE SET
    exchange_symbol = EXCLUDED.exchange_symbol,
    trading_pair = EXCLUDED.trading_pair,
    multiplier = EXCLUDED.multiplier;

INSERT INTO unified_symbol_exchanges (unified_symbol_id, exchange_id, exchange_symbol, trading_pair, multiplier, is_active)
SELECT us.id, 'binance', '1000FLOKI', '1000FLOKIUSDT', 1000, true
FROM unified_symbols us WHERE us.unified_id = 'floki'
ON CONFLICT (unified_symbol_id, exchange_id) DO UPDATE SET
    exchange_symbol = EXCLUDED.exchange_symbol,
    trading_pair = EXCLUDED.trading_pair,
    multiplier = EXCLUDED.multiplier;

INSERT INTO unified_symbol_exchanges (unified_symbol_id, exchange_id, exchange_symbol, trading_pair, multiplier, is_active)
SELECT us.id, 'binance', '1000BONK', '1000BONKUSDT', 1000, true
FROM unified_symbols us WHERE us.unified_id = 'bonk'
ON CONFLICT (unified_symbol_id, exchange_id) DO UPDATE SET
    exchange_symbol = EXCLUDED.exchange_symbol,
    trading_pair = EXCLUDED.trading_pair,
    multiplier = EXCLUDED.multiplier;

-- For other exchanges, use standard symbol (multiplier = 1)
-- KuCoin, Gate.io, Huobi typically use SHIB, PEPE, FLOKI, BONK directly
INSERT INTO unified_symbol_exchanges (unified_symbol_id, exchange_id, exchange_symbol, trading_pair, multiplier, is_active)
SELECT us.id, 'kucoin', 'SHIB', 'SHIB-USDT', 1, true
FROM unified_symbols us WHERE us.unified_id = 'shiba-inu'
ON CONFLICT (unified_symbol_id, exchange_id) DO UPDATE SET
    exchange_symbol = EXCLUDED.exchange_symbol,
    trading_pair = EXCLUDED.trading_pair,
    multiplier = EXCLUDED.multiplier;

INSERT INTO unified_symbol_exchanges (unified_symbol_id, exchange_id, exchange_symbol, trading_pair, multiplier, is_active)
SELECT us.id, 'kucoin', 'PEPE', 'PEPE-USDT', 1, true
FROM unified_symbols us WHERE us.unified_id = 'pepe'
ON CONFLICT (unified_symbol_id, exchange_id) DO UPDATE SET
    exchange_symbol = EXCLUDED.exchange_symbol,
    trading_pair = EXCLUDED.trading_pair,
    multiplier = EXCLUDED.multiplier;

INSERT INTO unified_symbol_exchanges (unified_symbol_id, exchange_id, exchange_symbol, trading_pair, multiplier, is_active)
SELECT us.id, 'gateio', 'SHIB', 'SHIB_USDT', 1, true
FROM unified_symbols us WHERE us.unified_id = 'shiba-inu'
ON CONFLICT (unified_symbol_id, exchange_id) DO UPDATE SET
    exchange_symbol = EXCLUDED.exchange_symbol,
    trading_pair = EXCLUDED.trading_pair,
    multiplier = EXCLUDED.multiplier;

INSERT INTO unified_symbol_exchanges (unified_symbol_id, exchange_id, exchange_symbol, trading_pair, multiplier, is_active)
SELECT us.id, 'gateio', 'PEPE', 'PEPE_USDT', 1, true
FROM unified_symbols us WHERE us.unified_id = 'pepe'
ON CONFLICT (unified_symbol_id, exchange_id) DO UPDATE SET
    exchange_symbol = EXCLUDED.exchange_symbol,
    trading_pair = EXCLUDED.trading_pair,
    multiplier = EXCLUDED.multiplier;

COMMENT ON TABLE unified_symbols IS 'Unified symbol identifiers across all exchanges (CoinGecko-style)';
COMMENT ON TABLE unified_symbol_exchanges IS 'Exchange-specific symbol mappings with price multipliers';
COMMENT ON COLUMN unified_symbol_exchanges.multiplier IS 'Price multiplier (e.g., 1000 for 1000SHIB means price should be multiplied by 1000 to match SHIB)';

