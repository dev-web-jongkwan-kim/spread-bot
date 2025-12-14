import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { DataRetentionService } from './data-retention.service';
import { Alert } from '../database/entities/alert.entity';
import { User } from '../database/entities/user.entity';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, User]),
    ScheduleModule.forRoot(),
    ConfigModule,
  ],
  providers: [DataRetentionService],
  exports: [DataRetentionService],
})
export class DataRetentionModule {}

