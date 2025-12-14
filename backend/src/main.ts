import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from './config/config.service';
import { TelegramService } from './telegram/telegram.service';
import { SymbolService } from './symbol/symbol.service';
import { UserService } from './user/user.service';
import { UserRole, PlanType } from './common/constants';
import { EnvValidator } from './common/env-validator';
import * as helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  // Environment validation
  try {
    EnvValidator.validate(config);
  } catch (error) {
    console.error('Environment validation failed:', error);
    if (config.appEnv === 'production') {
      process.exit(1);
    }
  }

  // Run database migrations on startup (production only)
  if (config.appEnv === 'production') {
    try {
      const { DataSource } = await import('typeorm');
      const migrationPath = require('path').join(__dirname, 'database', 'migrations', '*.sql');
      
      // Note: In production, migrations should be run separately before deployment
      // This is a fallback for automatic migration
      console.log('[MIGRATION] Production mode - ensure migrations are run before deployment');
    } catch (error) {
      console.warn('[MIGRATION] Migration check skipped:', error);
    }
  }

  // Sentry initialization
  if (config.sentryDsn && config.appEnv === 'production') {
    try {
      // Conditionally load profiling integration
      let profilingIntegration: any = null;
      try {
        const { nodeProfilingIntegration } = require('@sentry/profiling-node');
        profilingIntegration = nodeProfilingIntegration();
      } catch (error) {
        console.warn('[SENTRY] Profiling integration not available, continuing without it');
      }

      const integrations = profilingIntegration 
        ? [profilingIntegration]
        : [];

      Sentry.init({
        dsn: config.sentryDsn,
        environment: config.appEnv,
        integrations,
        tracesSampleRate: 0.1,
        profilesSampleRate: profilingIntegration ? 0.1 : undefined,
      });
      console.log('[SENTRY] Initialized for production');
    } catch (error) {
      console.error('[SENTRY] Failed to initialize:', error);
    }
  }

  // Security: Helmet
  app.use(helmet.default({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS - Production-safe configuration
  const allowedOrigins: string[] = [];
  
  if (config.appEnv === 'production') {
    // Production: Only allow configured frontend URL
    if (config.frontendUrl) {
      allowedOrigins.push(config.frontendUrl);
    }
  } else {
    // Development: Allow localhost and ngrok
    allowedOrigins.push(
      'http://localhost:3032',
      'https://localhost:3032',
      config.frontendUrl || 'http://localhost:3032',
    );
    
    if (process.env.NGROK_URL) {
      allowedOrigins.push(process.env.NGROK_URL);
    }
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Same-origin requests (no origin header)
      if (!origin) {
        return callback(null, true);
      }

      // Development: Allow localhost and ngrok
      if (config.appEnv !== 'production') {
        if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('ngrok')) {
          return callback(null, true);
        }
      }

      // Check against allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Production: Reject unknown origins
      if (config.appEnv === 'production') {
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'), false);
      }

      // Development: Allow all
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API Documentation (Internal use only)
  if (config.appEnv !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CryptoSpreadBot API')
      .setDescription('Internal API documentation for CryptoSpreadBot')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('api', 'Main API endpoints')
      .addTag('admin', 'Admin-only endpoints')
      .addTag('health', 'Health check endpoints')
      .build();
    
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, document, {
      customSiteTitle: 'CryptoSpreadBot API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
    });
    
    console.log(`📚 Swagger docs available at: http://localhost:${port}/api-docs`);
  }

  // Telegram webhook 설정 (에러 발생 시 무시)
  try {
    const telegramService = app.get(TelegramService);
    if (config.appEnv === 'production' && config.telegramWebhookUrl) {
      await telegramService.setWebhook(
        `${config.telegramWebhookUrl}/webhook/telegram`,
        config.telegramWebhookSecret,
      );
    }
  } catch (error) {
    console.warn('Telegram webhook setup failed:', error);
  }

  // 심볼 동기화 - 기본적으로 항상 실행 (DB에 심볼이 없으면 동기화)
  const symbolService = app.get(SymbolService);
  
  try {
    // 먼저 DB에 심볼이 있는지 확인
    const existingSymbolCount = await symbolService.getActiveSymbols();
    console.log(`[SYMBOL SYNC] Current active symbols in DB: ${existingSymbolCount.length}`);
    
    if (existingSymbolCount.length === 0) {
      // DB에 심볼이 없으면 자동으로 동기화 실행
      console.log('[SYMBOL SYNC] ==========================================');
      console.log('[SYMBOL SYNC] No symbols in DB, starting automatic sync...');
      console.log('[SYMBOL SYNC] ==========================================');
      
      const startTime = Date.now();
      await symbolService.syncAll();
      const duration = Date.now() - startTime;
      
      const finalCount = await symbolService.getActiveSymbols();
      console.log('[SYMBOL SYNC] ==========================================');
      console.log(`[SYMBOL SYNC] Symbol sync completed successfully in ${duration}ms`);
      console.log(`[SYMBOL SYNC] Total symbols in DB: ${finalCount.length}`);
      console.log('[SYMBOL SYNC] ==========================================');
    } else {
      console.log(`[SYMBOL SYNC] DB already has ${existingSymbolCount.length} symbols, skipping sync`);
      
      // 환경 변수가 true면 강제로 동기화
      if (process.env.SYNC_SYMBOLS_ON_START === 'true') {
        console.log('[SYMBOL SYNC] SYNC_SYMBOLS_ON_START=true, forcing sync...');
        const startTime = Date.now();
        await symbolService.syncAll();
        const duration = Date.now() - startTime;
        const finalCount = await symbolService.getActiveSymbols();
        console.log(`[SYMBOL SYNC] Forced sync completed in ${duration}ms, total symbols: ${finalCount.length}`);
      }
    }
  } catch (error) {
    console.error('[SYMBOL SYNC] ==========================================');
    console.error('[SYMBOL SYNC] Symbol sync on startup FAILED!');
    console.error('[SYMBOL SYNC] Error:', error);
    if (error instanceof Error) {
      console.error('[SYMBOL SYNC] Error message:', error.message);
      console.error('[SYMBOL SYNC] Error stack:', error.stack);
    }
    console.error('[SYMBOL SYNC] ==========================================');
  }

  // 어드민 계정 생성/확인
  try {
    const userService = app.get(UserService);
    const ADMIN_TELEGRAM_ID = 123456789; // 어드민용 고정 Telegram ID
    
    let adminUser = await userService.getByTelegramId(ADMIN_TELEGRAM_ID);
    
    if (!adminUser) {
      // 어드민 계정 생성
      adminUser = await userService.createOrUpdate(ADMIN_TELEGRAM_ID, {
        username: 'admin',
        firstName: 'System',
        lastName: 'Admin',
        plan: PlanType.WHALE,
      });
      console.log('[ADMIN] Created admin account with Telegram ID:', ADMIN_TELEGRAM_ID);
    }
    
    // 어드민 권한 확인 및 설정
    if ((adminUser as any).role !== UserRole.ADMIN) {
      await userService.update(adminUser.id, { role: UserRole.ADMIN } as any);
      console.log('[ADMIN] Updated admin role for user:', adminUser.id);
    } else {
      console.log('[ADMIN] Admin account exists:', adminUser.id);
    }
  } catch (error) {
    console.warn('[ADMIN] Failed to setup admin account:', error);
  }

  const port = config.port;
  await app.listen(port);
  
  console.log('==========================================');
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📊 Environment: ${config.appEnv}`);
  console.log(`🔒 Security: Helmet enabled, CORS configured`);
  console.log(`⚡ Rate Limiting: Enabled (100 req/min)`);
  if (config.sentryDsn) {
    console.log(`📈 Monitoring: Sentry enabled`);
  }
  console.log(`💚 Health Check: http://localhost:${port}/health`);
  console.log('==========================================');
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  Sentry.captureException(reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  Sentry.captureException(error);
  process.exit(1);
});

bootstrap();
