import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Exchange } from '../../exchanges/entities/exchange.entity';

export enum PaymentMethod {
  CARD = 'card',
  MOMO = 'momo',
  BOTH = 'both',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentProvider {
  PAYSTACK = 'paystack',
  HUBTEL = 'hubtel',
}

export enum PaymentPurpose {
  SUBSCRIPTION = 'subscription',
  EXCHANGE = 'exchange',
  OTHER = 'other',
}

@Entity('payments')
@Index(['user_id'])
@Index(['exchange_id'])
@Index(['subscription_id'])
@Index(['reference'], { unique: true })
@Index(['status'])
@Index(['created_at'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid', { nullable: true })
  exchange_id: string;

  @ManyToOne(() => Exchange, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'exchange_id' })
  exchange: Exchange;

  @Column('uuid', { nullable: true })
  subscription_id: string;

  @Column({
    type: 'enum',
    enum: PaymentPurpose,
    default: PaymentPurpose.SUBSCRIPTION,
  })
  purpose: PaymentPurpose;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  method: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 255, unique: true })
  reference: string;

  @Column({
    type: 'enum',
    enum: PaymentProvider,
  })
  provider: PaymentProvider;

  @Column({ type: 'varchar', length: 255, nullable: true })
  provider_reference: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  failure_reason: string;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
