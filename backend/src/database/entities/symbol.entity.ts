import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ExchangeSymbol } from './exchange-symbol.entity';

@Entity('symbols')
export class Symbol {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  symbol: string; // 바이낸스 기준 심볼명

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null; // 코인 이름 (ex: Bitcoin, Ethereum)

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ExchangeSymbol, (exchangeSymbol) => exchangeSymbol.symbol)
  exchangeSymbols: ExchangeSymbol[];
}

