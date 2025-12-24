import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { UserModule } from '../user/user.module';
import { ConfigModule } from '../config/config.module';
import { TelegramModule } from '../telegram/telegram.module';
import { WebhookEvent } from '../database/entities/webhook-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEvent]),
    UserModule,
    ConfigModule,
    TelegramModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}


