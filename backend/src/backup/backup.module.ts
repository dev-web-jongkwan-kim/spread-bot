import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupService } from './backup.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ScheduleModule.forRoot(), ConfigModule],
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}

