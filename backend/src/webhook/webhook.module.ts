import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { UserModule } from '../user/user.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [UserModule, ConfigModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}


