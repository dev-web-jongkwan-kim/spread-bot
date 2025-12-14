import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 20, name: 'symbol' })
  symbol: string;

  @Column({ type: 'decimal', precision: 6, scale: 3, name: 'spread_percent' })
  spreadPercent: number;

  @Column({ type: 'varchar', length: 50, name: 'buy_exchange' })
  buyExchange: string;

  @Column({ type: 'decimal', precision: 20, scale: 8, name: 'buy_price' })
  buyPrice: number;

  @Column({ type: 'varchar', length: 50, name: 'sell_exchange' })
  sellExchange: string;

  @Column({ type: 'decimal', precision: 20, scale: 8, name: 'sell_price' })
  sellPrice: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true, name: 'potential_profit' })
  potentialProfit: number | null;

  @Column({ type: 'boolean', default: false, name: 'was_clicked' })
  wasClicked: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.alerts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}


