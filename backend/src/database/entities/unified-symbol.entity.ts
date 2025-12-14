import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UnifiedSymbolExchange } from './unified-symbol-exchange.entity';

@Entity('unified_symbols')
export class UnifiedSymbol {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'unified_id', unique: true })
  unifiedId: string;

  @Column()
  name: string;

  @Column({ name: 'standard_symbol' })
  standardSymbol: string;

  @Column({ name: 'coingecko_id', nullable: true })
  coingeckoId: string;

  @Column({ name: 'coinmarketcap_id', nullable: true })
  coinmarketcapId: number;

  @Column({ nullable: true })
  category: string;

  @Column({ name: 'market_cap_rank', nullable: true })
  marketCapRank: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => UnifiedSymbolExchange, (use) => use.unifiedSymbol)
  exchangeMappings: UnifiedSymbolExchange[];
}

