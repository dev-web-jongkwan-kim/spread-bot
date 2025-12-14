import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Log } from '../database/entities/log.entity';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api/logs')
export class LogController {
  constructor(
    @InjectRepository(Log)
    private readonly logRepo: Repository<Log>,
  ) {}

  @Post()
  async createLog(@Body() body: any, @Request() req: any) {
    try {
      const userId = req?.user?.id || null;

      const log = this.logRepo.create({
        level: body.level || 'info',
        message: body.message || '',
        data: body.data || null,
        userId,
        url: body.url || null,
        userAgent: body.userAgent || null,
        error: body.error || null,
      });

      await this.logRepo.save(log);
      return { success: true };
    } catch (error) {
      // 로그 저장 실패는 무시 (무한 루프 방지)
      console.error('Failed to save log:', error);
      return { success: false };
    }
  }
}

