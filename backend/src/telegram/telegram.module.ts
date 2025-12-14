import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramService } from './telegram.service';
import { TelegramUpdate } from './telegram.update';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { UserModule } from '../user/user.module';
import { AlertModule } from '../alert/alert.module';
import { ExchangeModule } from '../exchange/exchange.module';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const token = config.telegramBotToken;
        if (!token || token === '') {
          console.warn('TELEGRAM_BOT_TOKEN not set, Telegram bot will not work');
          // 더미 토큰으로 초기화 (실제로는 에러 발생하지만 앱은 시작됨)
          return {
            token: 'dummy-token-for-development',
          };
        }
        return {
          token,
        };
      },
    }),
    ConfigModule,
    UserModule,
    AlertModule,
    ExchangeModule,
  ],
  providers: [TelegramService, TelegramUpdate],
  exports: [TelegramService],
})
export class TelegramModule {}


