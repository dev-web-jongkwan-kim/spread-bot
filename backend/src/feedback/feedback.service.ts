import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface FeedbackData {
  userId: string;
  type: 'bug' | 'feature' | 'improvement' | 'other';
  subject: string;
  message: string;
  rating?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  // In-memory storage for now (can be moved to DB later)
  private feedbacks: FeedbackData[] = [];

  async submitFeedback(feedback: FeedbackData): Promise<{ success: boolean; id: string }> {
    const id = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.feedbacks.push({
      ...feedback,
      id,
      createdAt: new Date(),
    });

    this.logger.log(`[FEEDBACK] New feedback submitted: ${feedback.type} from user ${feedback.userId}`);
    
    // In production, this would be saved to database and/or sent to support system
    return { success: true, id };
  }

  async getFeedbacks(userId?: string): Promise<FeedbackData[]> {
    if (userId) {
      return this.feedbacks.filter(f => f.userId === userId);
    }
    return this.feedbacks;
  }
}

