import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { TelegramService } from './telegram/telegram.service';
import { SymbolService } from './symbol/symbol.service';
import { UserService } from './user/user.service';
import { UserRole, PlanType } from './common/constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  
  // Enable CORS
  const allowedOrigins = [
    config.frontendUrl || 'http://localhost:3032',
    'http://localhost:3032',
    'https://localhost:3032',
  ];

  // ngrok 도메인 자동 감지 (환경 변수에서)
  if (process.env.NGROK_URL) {
    allowedOrigins.push(process.env.NGROK_URL);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // origin이 없으면 (같은 origin에서 요청) 허용
      if (!origin) {
        return callback(null, true);
      }
      // ngrok 도메인 패턴 허용
      if (origin.includes('ngrok') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      // 설정된 origin 확인
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(null, true); // 개발 환경에서는 모두 허용
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

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
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
