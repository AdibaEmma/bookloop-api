import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Listing } from '../../listings/entities/listing.entity';
import { User } from '../../users/entities/user.entity';

/**
 * ExchangeRequest Entity
 *
 * Represents a book exchange request between two users.
 *
 * Workflow:
 * 1. User A sees User B's exchange listing
 * 2. User A has a book that User B wants
 * 3. User A initiates exchange (creates request)
 * 4. User B accepts/declines
 * 5. If accepted, they arrange meetup
 * 6. Both confirm completion
 *
 * Status Flow:
 * pending → accepted → completed
 *         ↘ declined
 *         ↘ cancelled
 */
@Entity('exchange_requests')
export class ExchangeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The user initiating the exchange
  @ManyToOne(() => User)
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @Column({ type: 'uuid' })
  requester_id: string;

  // The listing being offered by the requester
  @ManyToOne(() => Listing)
  @JoinColumn({ name: 'requester_listing_id' })
  requester_listing: Listing;

  @Column({ type: 'uuid' })
  requester_listing_id: string;

  // The listing being requested (owner receives request)
  @ManyToOne(() => Listing)
  @JoinColumn({ name: 'requested_listing_id' })
  requested_listing: Listing;

  @Column({ type: 'uuid' })
  requested_listing_id: string;

  // The owner of the requested listing
  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ type: 'uuid' })
  owner_id: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'declined', 'completed', 'cancelled'],
    default: 'pending',
  })
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

  // Optional message from requester
  @Column({ type: 'text', nullable: true })
  message: string;

  // Meetup details (set after acceptance)
  @Column({ type: 'text', nullable: true })
  meetup_address: string;

  @Column({ type: 'timestamp', nullable: true })
  meetup_time: Date;

  // Completion confirmations
  @Column({ type: 'boolean', default: false })
  requester_confirmed_completion: boolean;

  @Column({ type: 'boolean', default: false })
  owner_confirmed_completion: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
