import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Symbol } from './symbol.entity';

@Entity('exchange_symbols')
@Index(['symbolId', 'exchangeId'], { unique: true })
export class ExchangeSymbol {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'symbol_id' })
  symbolId: string;

  @Column({ type: 'varchar', length: 50, name: 'exchange_id' })
  exchangeId: string; // binance, coinbase, kraken 등

  @Column({ type: 'varchar', length: 50, name: 'exchange_symbol' })
  exchangeSymbol: string; // 해당 거래소에서 사용하는 심볼명

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Symbol, (symbol) => symbol.exchangeSymbols, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'symbol_id' })
  symbol: Symbol;
}

