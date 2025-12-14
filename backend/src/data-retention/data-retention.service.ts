import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Alert } from '../database/entities/alert.entity';
import { User } from '../database/entities/user.entity';
import { ConfigService } from '../config/config.service';

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Clean up old alerts (older than retention period)
   * Runs daily at 3 AM
   */
  @Cron('0 3 * * *', {
    name: 'cleanup-old-alerts',
    timeZone: 'UTC',
  })
  async cleanupOldAlerts() {
    const retentionDays = parseInt(process.env.ALERT_RETENTION_DAYS || '90', 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    this.logger.log(`[DATA RETENTION] Cleaning up alerts older than ${retentionDays} days (before ${cutoffDate.toISOString()})`);

    try {
      const result = await this.alertRepo.delete({
        createdAt: LessThan(cutoffDate),
      });

      this.logger.log(`[DATA RETENTION] Deleted ${result.affected || 0} old alerts`);
      return { deleted: result.affected || 0 };
    } catch (error) {
      this.logger.error(`[DATA RETENTION] Failed to cleanup old alerts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean up inactive user accounts
   * Runs weekly on Sunday at 4 AM
   */
  @Cron('0 4 * * 0', {
    name: 'cleanup-inactive-users',
    timeZone: 'UTC',
  })
  async cleanupInactiveUsers() {
    const inactiveDays = parseInt(process.env.INACTIVE_USER_DAYS || '365', 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    this.logger.log(`[DATA RETENTION] Cleaning up users inactive for ${inactiveDays} days`);

    try {
      // Find users with no alerts in the last year and free plan
      const inactiveUsers = await this.userRepo
        .createQueryBuilder('user')
        .leftJoin('user.alerts', 'alert')
        .where('user.plan = :plan', { plan: 'free' })
        .andWhere('user.createdAt < :cutoffDate', { cutoffDate })
        .having('MAX(alert.createdAt) IS NULL OR MAX(alert.createdAt) < :cutoffDate', { cutoffDate })
        .groupBy('user.id')
        .getMany();

      // Anonymize instead of delete (for legal/audit purposes)
      for (const user of inactiveUsers) {
        await this.userRepo.update(user.id, {
          telegramId: 0,
          username: 'inactive_user',
          firstName: 'Inactive',
          lastName: 'User',
        });
      }

      this.logger.log(`[DATA RETENTION] Anonymized ${inactiveUsers.length} inactive users`);
      return { anonymized: inactiveUsers.length };
    } catch (error) {
      this.logger.error(`[DATA RETENTION] Failed to cleanup inactive users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Manual cleanup trigger
   */
  async cleanupAlerts(retentionDays: number = 90): Promise<{ deleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.alertRepo.delete({
      createdAt: LessThan(cutoffDate),
    });

    this.logger.log(`[DATA RETENTION] Manually deleted ${result.affected || 0} alerts older than ${retentionDays} days`);
    return { deleted: result.affected || 0 };
  }
}

