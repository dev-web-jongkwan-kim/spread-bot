import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { RedisService } from '../redis/redis.service';

export interface AlertJobData {
  userId: string;
  telegramId: number;
  symbol: string;
  spreadPercent: number;
  buyExchange: string;
  buyPrice: number;
  sellExchange: string;
  sellPrice: number;
  potentialProfit: number;
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private alertQueue: Queue<AlertJobData>;
  private alertWorker: Worker<AlertJobData>;

  constructor(private readonly redisService: RedisService) {
    const redisClient = redisService.getClient();

    // Alert queue for sending notifications
    this.alertQueue = new Queue<AlertJobData>('alerts', {
      connection: redisClient,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000, // Keep max 1000 completed jobs
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
    });

    // Worker to process alert jobs
    this.alertWorker = new Worker<AlertJobData>(
      'alerts',
      async (job: Job<AlertJobData>) => {
        this.logger.debug(`Processing alert job ${job.id} for user ${job.data.userId}`);
        // The actual alert sending logic will be handled by AlertService
        // This worker just processes the queue
        return { processed: true, jobId: job.id };
      },
      {
        connection: redisClient,
        concurrency: 10, // Process up to 10 jobs concurrently
      },
    );

    this.alertWorker.on('completed', (job) => {
      this.logger.debug(`Alert job ${job.id} completed`);
    });

    this.alertWorker.on('failed', (job, err) => {
      this.logger.error(`Alert job ${job?.id} failed: ${err.message}`);
    });

    this.logger.log('Queue service initialized');
  }

  async addAlertJob(data: AlertJobData): Promise<Job<AlertJobData>> {
    return await this.alertQueue.add('send-alert', data, {
      priority: data.spreadPercent > 5 ? 1 : 5, // Higher spread = higher priority
    });
  }

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.alertQueue.getWaitingCount(),
      this.alertQueue.getActiveCount(),
      this.alertQueue.getCompletedCount(),
      this.alertQueue.getFailedCount(),
    ]);

    return {
      alerts: {
        waiting,
        active,
        completed,
        failed,
      },
    };
  }

  async onModuleDestroy() {
    await this.alertWorker.close();
    await this.alertQueue.close();
    this.logger.log('Queue service closed');
  }
}

