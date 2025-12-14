# CryptoSpreadBot Architecture

## System Overview

CryptoSpreadBot is a real-time cryptocurrency arbitrage opportunity monitoring service built with NestJS (backend) and React (frontend).

## Architecture Diagram

```
┌─────────────┐
│   Frontend  │ (React + Vite)
│  (Port 3032)│
└──────┬──────┘
       │
       │ HTTP/HTTPS
       │
┌──────▼──────┐
│   Backend   │ (NestJS)
│  (Port 3033)│
└──────┬──────┘
       │
       ├──────────┬──────────┬──────────┐
       │          │          │          │
┌──────▼──┐ ┌────▼────┐ ┌───▼────┐ ┌───▼────┐
│PostgreSQL│ │  Redis  │ │Telegram│ │Exchanges│
│          │ │         │ │  Bot   │ │  (CCXT) │
└──────────┘ └─────────┘ └────────┘ └─────────┘
```

## Core Components

### Backend Services

1. **ExchangeService**: Handles communication with cryptocurrency exchanges via CCXT
2. **PriceMonitorService**: Monitors prices and calculates spreads
3. **AlertService**: Sends notifications via Telegram
4. **SymbolService**: Manages cryptocurrency symbol synchronization
5. **QueueService**: Handles async job processing (BullMQ)
6. **CacheService**: Redis-based caching for prices and cooldowns
7. **DataRetentionService**: Automated data cleanup
8. **BackupService**: Automated database backups

### Frontend Components

1. **Dashboard**: Real-time price comparisons and alerts
2. **Coins**: Manage monitored cryptocurrencies
3. **Exchanges**: Configure exchange preferences
4. **Alerts**: View alert history
5. **Admin Panel**: System monitoring and management

## Data Flow

### Price Monitoring Flow
```
1. PriceMonitorService triggers every 10 seconds
2. For each monitored symbol:
   a. ExchangeService fetches prices from all enabled exchanges
   b. Spread is calculated
   c. If spread > threshold, AlertService is triggered
3. AlertService checks user preferences and sends via QueueService
4. QueueService processes alert jobs and sends Telegram messages
```

### Symbol Synchronization Flow
```
1. SymbolService syncs symbols from Binance (primary)
2. For each exchange:
   a. Fetch available symbols
   b. Map to Binance standard format
   c. Store in database (symbols, exchange_symbols)
3. Unified symbols are synced from CoinGecko
4. Exchange mappings are created for unified symbols
```

## Database Schema

### Core Tables
- `users`: User accounts and preferences
- `user_coins`: User's monitored coins
- `user_exchanges`: User's enabled exchanges
- `alerts`: Alert history
- `symbols`: Cryptocurrency symbols (Binance standard)
- `exchange_symbols`: Exchange-specific symbol mappings
- `unified_symbols`: CoinGecko unified symbols
- `unified_symbol_exchanges`: Unified symbol exchange mappings

## Security

- JWT authentication
- Rate limiting (100 req/min)
- CORS protection
- Helmet.js security headers
- Input validation
- Admin guard for admin routes

## Performance Optimizations

- Redis caching for price data (5s TTL)
- Database indexes on frequently queried columns
- Circuit breaker for external API calls
- Job queue for async operations
- Connection pooling for database

## Monitoring

- Health check endpoints
- Sentry error tracking
- Structured logging (Winston)
- Admin dashboard for system metrics

## Deployment

- Docker support
- Environment-based configuration
- Automated migrations
- Automated backups
- CI/CD via GitHub Actions

