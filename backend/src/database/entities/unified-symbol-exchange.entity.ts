import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UnifiedSymbol } from './unified-symbol.entity';

@Entity('unified_symbol_exchanges')
export class UnifiedSymbolExchange {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'unified_symbol_id' })
  unifiedSymbolId: number;

  @Column({ name: 'exchange_id' })
  exchangeId: string;

  @Column({ name: 'exchange_symbol' })
  exchangeSymbol: string;

  @Column({ name: 'trading_pair', nullable: true })
  tradingPair: string;

  @Column({ type: 'decimal', precision: 20, scale: 10, default: 1 })
  multiplier: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_verified_at', nullable: true })
  lastVerifiedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => UnifiedSymbol, (us) => us.exchangeMappings)
  @JoinColumn({ name: 'unified_symbol_id' })
  unifiedSymbol: UnifiedSymbol;
}

