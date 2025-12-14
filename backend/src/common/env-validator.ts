import { Logger } from '@nestjs/common';

export class EnvValidator {
  private static readonly logger = new Logger(EnvValidator.name);

  static validate(config: any): void {
    const errors: string[] = [];

    // Required in production
    if (config.appEnv === 'production') {
      if (!config.databaseUrl) {
        errors.push('DATABASE_URL is required in production');
      }
      if (!config.telegramBotToken) {
        errors.push('TELEGRAM_BOT_TOKEN is required in production');
      }
      if (!config.frontendUrl) {
        errors.push('FRONTEND_URL is required in production');
      }
    }

    // Validate database URL format
    if (config.databaseUrl && !config.databaseUrl.startsWith('postgresql://')) {
      errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
    }

    // Validate port
    if (config.port && (config.port < 1 || config.port > 65535)) {
      errors.push('PORT must be between 1 and 65535');
    }

    if (errors.length > 0) {
      const errorMessage = `Environment validation failed:\n${errors.join('\n')}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.log('Environment variables validated successfully');
  }
}

