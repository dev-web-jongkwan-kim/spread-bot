import { Controller, Post, Get, Body, Request, UseGuards } from '@nestjs/common';
import { FeedbackService, FeedbackData } from './feedback.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api/feedback')
@UseGuards(AuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async submitFeedback(
    @Body() body: Omit<FeedbackData, 'userId'>,
    @Request() req: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    return await this.feedbackService.submitFeedback({
      ...body,
      userId,
    });
  }

  @Get()
  async getFeedbacks(@Request() req: any) {
    const userId = req?.user?.id;
    return await this.feedbackService.getFeedbacks(userId);
  }
}

