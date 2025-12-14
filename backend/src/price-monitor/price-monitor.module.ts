import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PriceMonitorService } from './price-monitor.service';
import { ExchangeModule } from '../exchange/exchange.module';
import { AlertModule } from '../alert/alert.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ExchangeModule,
    AlertModule,
    UserModule,
  ],
  providers: [PriceMonitorService],
  exports: [PriceMonitorService],
})
export class PriceMonitorModule {}


