import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService } from './health.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
@Public()
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check() {
    return this.healthService.check();
  }

  @Get('ready')
  async readiness() {
    return this.healthService.readiness();
  }

  @Get('live')
  async liveness() {
    return this.healthService.liveness();
  }
}

