import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Exchange } from './exchange.entity';

/**
 * Rating Entity
 *
 * Stores ratings and reviews given after exchange completion.
 *
 * Business Rules:
 * - Each user can rate the other party once per exchange
 * - Ratings are 1-5 stars
 * - Reviews are optional text feedback
 * - Ratings are only visible after both parties rate (or after 7 days)
 *
 * Composite unique constraint prevents duplicate ratings
 */
@Entity('ratings')
@Unique(['exchange_id', 'rater_id', 'rated_user_id'])
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The exchange being rated
  @ManyToOne(() => Exchange)
  @JoinColumn({ name: 'exchange_id' })
  exchange: Exchange;

  @Column({ type: 'uuid' })
  exchange_id: string;

  // User giving the rating
  @ManyToOne(() => User)
  @JoinColumn({ name: 'rater_id' })
  rater: User;

  @Column({ type: 'uuid' })
  rater_id: string;

  // User receiving the rating
  @ManyToOne(() => User)
  @JoinColumn({ name: 'rated_user_id' })
  rated_user: User;

  @Column({ type: 'uuid' })
  rated_user_id: string;

  // Rating (1-5 stars)
  @Column({ type: 'int' })
  rating: number;

  // Optional review text
  @Column({ type: 'text', nullable: true })
  review: string;

  // Visibility flag (hidden until both parties rate or 7 days pass)
  @Column({ type: 'boolean', default: false })
  is_visible: boolean;

  @CreateDateColumn()
  created_at: Date;
}
