import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('logs')
@Index(['userId', 'createdAt'])
@Index(['level', 'createdAt'])
@Index(['createdAt'])
export class Log {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, name: 'level' })
  level: string; // debug, info, warn, error

  @Column({ type: 'text', name: 'message' })
  message: string;

  @Column({ type: 'jsonb', nullable: true, name: 'data' })
  data: any;

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  @Index()
  userId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'url' })
  url: string | null;

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'error' })
  error: {
    message: string;
    stack?: string;
    name?: string;
  } | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}

