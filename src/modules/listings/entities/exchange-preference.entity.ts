import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Listing } from './listing.entity';
import { Book } from '../../books/entities/book.entity';

/**
 * ExchangePreference Entity
 *
 * Stores user's preferred books for exchange listings.
 * Users can select 1-3 books they want in return based on subscription tier.
 *
 * Design:
 * - Links to books table (not listings) - survives listing deletions
 * - Priority determines order (1 = highest priority)
 * - Free: 1 preference, Basic: 2 preferences, Premium: 3 preferences
 */
@Entity('exchange_preferences')
export class ExchangePreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column({ type: 'uuid' })
  listing_id: string;

  @ManyToOne(() => Book)
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ type: 'uuid' })
  book_id: string;

  // Priority: 1 (highest), 2, 3 (lowest)
  @Column({ type: 'int', default: 1 })
  priority: number;

  @CreateDateColumn()
  created_at: Date;
}
