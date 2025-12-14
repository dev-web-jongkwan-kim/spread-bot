import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserCoin } from './user-coin.entity';
import { UserExchange } from './user-exchange.entity';
import { Alert } from './alert.entity';
import { PlanType, Language, UserRole } from '../../common/constants';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unique: true, name: 'telegram_id' })
  telegramId: number;

  @Column({ type: 'varchar', length: 20, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'username' })
  username: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'first_name' })
  firstName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'last_name' })
  lastName: string | null;

  @Column({ type: 'varchar', length: 5, default: Language.EN })
  language: Language;

  @Column({ type: 'varchar', length: 20, default: PlanType.FREE })
  plan: PlanType;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  threshold: number;

  @Column({ type: 'boolean', default: false, name: 'is_muted' })
  isMuted: boolean;

  @Column({ type: 'timestamptz', nullable: true, name: 'muted_until' })
  mutedUntil: Date | null;

  @Column({ type: 'int', default: 0, name: 'daily_alerts_sent' })
  dailyAlertsSent: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE', name: 'alerts_reset_at' })
  alertsResetAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'ls_customer_id' })
  lsCustomerId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'ls_subscription_id' })
  lsSubscriptionId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'ls_subscription_status' })
  lsSubscriptionStatus: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'ls_current_period_end' })
  lsCurrentPeriodEnd: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => UserCoin, (userCoin) => userCoin.user)
  coins: UserCoin[];

  @OneToMany(() => UserExchange, (userExchange) => userExchange.user)
  exchanges: UserExchange[];

  @OneToMany(() => Alert, (alert) => alert.user)
  alerts: Alert[];
}



