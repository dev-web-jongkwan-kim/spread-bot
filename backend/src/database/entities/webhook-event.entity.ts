import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('webhook_events')
@Index(['eventName', 'createdAt'])
@Index(['subscriptionId'])
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, name: 'event_name' })
  eventName: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'subscription_id' })
  subscriptionId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: any;

  @Column({ type: 'varchar', length: 50, default: 'success' })
  status: string; // success, failed

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
