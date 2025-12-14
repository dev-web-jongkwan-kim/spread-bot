# CryptoSpreadBot Deployment Guide

## Overview
This document provides comprehensive deployment instructions for CryptoSpreadBot.

## Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- pnpm package manager
- Docker (optional, for containerized deployment)

## Environment Variables

### Backend (.env)
```bash
# Application
APP_ENV=production
APP_DEBUG=false
PORT=3033
FRONTEND_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cryptospreadbot
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_PASSWORD=your_redis_password
REDIS_SSL=false

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_URL=https://yourdomain.com
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret

# Security
JWT_SECRET=your_jwt_secret

# Monitoring
SENTRY_DSN=your_sentry_dsn

# Optional: Enable Swagger in production
ENABLE_SWAGGER=false

# Data Retention
ALERT_RETENTION_DAYS=90
INACTIVE_USER_DAYS=365
```

### Frontend (.env)
```bash
VITE_API_URL=https://api.yourdomain.com
VITE_TELEGRAM_BOT_USERNAME=your_bot_username
```

## Database Setup

1. Create database:
```bash
createdb cryptospreadbot
```

2. Run migrations:
```bash
cd backend
pnpm run migrate
```

3. Verify migrations:
```bash
psql -d cryptospreadbot -c "\dt"
```

## Backend Deployment

### Development
```bash
cd backend
pnpm install
pnpm run start:dev
```

### Production
```bash
cd backend
pnpm install --prod
pnpm run build
pnpm run start:prod
```

### With PM2
```bash
pm2 start dist/main.js --name cryptospreadbot
pm2 save
pm2 startup
```

## Frontend Deployment

### Build
```bash
cd frontend
pnpm install
pnpm run build
```

### Serve with Nginx
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3033;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Docker Deployment

### docker-compose.yml
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: cryptospreadbot
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/cryptospreadbot
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

## Health Checks

- Backend: `http://localhost:3033/health`
- Readiness: `http://localhost:3033/health/ready`
- Liveness: `http://localhost:3033/health/live`

## Monitoring

### Sentry
Error tracking is automatically configured if `SENTRY_DSN` is set.

### Logs
- Backend logs: Check console output or log files
- Application logs: Structured logging via Winston

## Backup

### Automated Backups
Backups run daily at 2 AM UTC. Configure via:
```bash
BACKUP_DIR=/path/to/backups
```

### Manual Backup
```bash
cd backend
pnpm run backup:db
```

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL format
- Check PostgreSQL is running
- Verify network connectivity

### Redis Connection Issues
- Verify REDIS_URL format
- Check Redis is running
- Verify authentication if password is set

### Symbol Sync Issues
- Check exchange API availability
- Verify network connectivity
- Check logs for specific errors

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable Sentry monitoring
- [ ] Configure firewall rules
- [ ] Set up automated backups
- [ ] Enable database SSL if required

## Performance Optimization

- Database indexes are automatically created via migration 005
- Redis caching is enabled for price data
- Circuit breaker prevents cascading failures
- Job queue handles async operations

## Maintenance

### Regular Tasks
- Monitor disk space for backups
- Review error logs weekly
- Check database performance
- Review user feedback

### Data Retention
- Old alerts are automatically cleaned up (90 days default)
- Inactive users are anonymized (365 days default)

