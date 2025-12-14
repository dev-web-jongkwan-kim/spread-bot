import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '../config/config.service';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Run database backup daily at 2 AM
   */
  @Cron('0 2 * * *', {
    name: 'daily-backup',
    timeZone: 'UTC',
  })
  async runDailyBackup() {
    this.logger.log('[BACKUP] Starting scheduled daily backup...');
    await this.backupDatabase();
  }

  /**
   * Manual backup trigger
   */
  async backupDatabase(): Promise<{ success: boolean; file?: string; error?: string }> {
    try {
      const backupScript = require('path').join(__dirname, '../../scripts/backup-database.sh');
      
      this.logger.log('[BACKUP] Executing backup script...');
      const { stdout, stderr } = await execAsync(`bash ${backupScript}`);

      if (stderr && !stderr.includes('warning')) {
        this.logger.error(`[BACKUP] Backup script stderr: ${stderr}`);
      }

      // Extract backup file path from output
      const fileMatch = stdout.match(/Database backup successful: (.+)/);
      const backupFile = fileMatch ? fileMatch[1] : 'unknown';

      this.logger.log(`[BACKUP] Backup completed successfully: ${backupFile}`);
      
      return {
        success: true,
        file: backupFile,
      };
    } catch (error) {
      this.logger.error(`[BACKUP] Backup failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Cleanup old backups (keep last 7 days)
   */
  @Cron('0 3 * * *', {
    name: 'cleanup-backups',
    timeZone: 'UTC',
  })
  async cleanupOldBackups() {
    try {
      const backupDir = process.env.BACKUP_DIR || './backups';
      const { stdout } = await execAsync(
        `find ${backupDir} -type f -name "*.sql" -mtime +7 -delete`,
      );
      this.logger.log('[BACKUP] Old backups cleaned up (kept last 7 days)');
    } catch (error) {
      this.logger.warn(`[BACKUP] Cleanup failed: ${error.message}`);
    }
  }
}

