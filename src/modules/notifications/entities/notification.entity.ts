import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  EXCHANGE_REQUEST = 'exchange_request',
  EXCHANGE_ACCEPTED = 'exchange_accepted',
  EXCHANGE_DECLINED = 'exchange_declined',
  EXCHANGE_COMPLETED = 'exchange_completed',
  EXCHANGE_CANCELLED = 'exchange_cancelled',
  EXCHANGE_REMINDER = 'exchange_reminder',
  RATING_RECEIVED = 'rating_received',
  MESSAGE_RECEIVED = 'message_received',
  LISTING_APPROVED = 'listing_approved',
  LISTING_REJECTED = 'listing_rejected',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
}

@Entity('notifications')
@Index(['user_id', 'read'])
@Index(['user_id', 'created_at'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  read: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
