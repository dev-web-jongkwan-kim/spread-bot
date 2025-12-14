import * as ccxt from 'ccxt';

const exchanges = ['binance', 'coinbase', 'kraken', 'okx', 'bybit', 'kucoin', 'gateio', 'huobi'];
const symbol = '1000RATS';
const quoteCurrency = 'USDT';

async function checkSymbol() {
  console.log(`\n========================================`);
  console.log(`Checking ${symbol} across all exchanges`);
  console.log(`========================================\n`);

  for (const exchangeId of exchanges) {
    try {
      console.log(`\n[${exchangeId.toUpperCase()}]`);
      console.log(`----------------------------------------`);
      
      // Create exchange instance
      const ExchangeClass = ccxt[exchangeId as keyof typeof ccxt] as typeof ccxt.Exchange;
      if (!ExchangeClass) {
        console.log(`❌ Exchange class not found`);
        continue;
      }

      const exchange = new ExchangeClass({
        enableRateLimit: true,
        timeout: 30000,
      });

      // Load markets
      console.log(`Loading markets...`);
      const markets = await exchange.loadMarkets();
      console.log(`✓ Loaded ${Object.keys(markets).length} markets`);

      // Search for 1000RATS
      const searchPatterns = [
        `${symbol}/${quoteCurrency}`,
        `${symbol}${quoteCurrency}`,
        `${symbol}-${quoteCurrency}`,
        `${symbol}_${quoteCurrency}`,
        symbol.toLowerCase(),
        symbol.toUpperCase(),
      ];

      let found = false;
      const foundMarkets: any[] = [];

      for (const [marketId, market] of Object.entries(markets)) {
        const m = market as ccxt.Market;
        
        // Check if it's a USDT pair
        if (m.quote === quoteCurrency && m.active !== false) {
          // Check various patterns
          if (
            m.base.toUpperCase() === symbol.toUpperCase() ||
            m.base.toUpperCase() === 'RATS' ||
            marketId.toUpperCase().includes(symbol.toUpperCase()) ||
            marketId.toUpperCase().includes('RATS')
          ) {
            foundMarkets.push({
              marketId,
              base: m.base,
              quote: m.quote,
              symbol: m.symbol,
              id: (m as any).id || marketId,
              active: m.active,
            });
            found = true;
          }
        }
      }

      if (found) {
        console.log(`\n✓ Found ${foundMarkets.length} matching market(s):`);
        for (let idx = 0; idx < foundMarkets.length; idx++) {
          const m = foundMarkets[idx];
          console.log(`\n  ${idx + 1}. Market ID: ${m.marketId}`);
          console.log(`     Base: ${m.base}`);
          console.log(`     Quote: ${m.quote}`);
          console.log(`     Symbol: ${m.symbol}`);
          console.log(`     ID: ${m.id}`);
          console.log(`     Active: ${m.active}`);
          
          // Try to fetch ticker
          if (m.base.toUpperCase() === symbol.toUpperCase()) {
            console.log(`     ⭐ Exact match for ${symbol}!`);
            try {
              const ticker = await exchange.fetchTicker(m.symbol);
              console.log(`     Price: $${ticker.last}`);
              console.log(`     Volume 24h: $${ticker.quoteVolume || 0}`);
            } catch (err: any) {
              console.log(`     ⚠️  Failed to fetch ticker: ${err.message}`);
            }
          }
        }
      } else {
        console.log(`\n❌ ${symbol} not found`);
        
        // Check if RATS exists
        const ratsMarkets = Object.entries(markets).filter(([_, m]) => {
          const market = m as ccxt.Market;
          return market.quote === quoteCurrency && 
                 market.active !== false &&
                 (market.base.toUpperCase() === 'RATS' || 
                  (market as any).id?.toUpperCase().includes('RATS'));
        });
        
        if (ratsMarkets.length > 0) {
          console.log(`\n  ℹ️  Found RATS (without 1000 prefix):`);
          ratsMarkets.forEach(([marketId, m]) => {
            const market = m as ccxt.Market;
            console.log(`     - ${marketId}: ${market.base}/${market.quote}`);
          });
        }
      }
    } catch (error: any) {
      console.log(`\n❌ Error: ${error.message}`);
      if (error.stack) {
        console.log(`   Stack: ${error.stack.split('\n')[0]}`);
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`Check completed`);
  console.log(`========================================\n`);
}

checkSymbol().catch(console.error);

