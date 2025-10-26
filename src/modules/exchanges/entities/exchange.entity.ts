import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Point } from 'geojson';
import { User } from '../../users/entities/user.entity';
import { Listing } from '../../listings/entities/listing.entity';

@Entity('exchanges')
export class Exchange {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Requester (person initiating the exchange)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @Column({ type: 'uuid' })
  requester_id: string;

  // Owner (person who owns the listing)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ type: 'uuid' })
  owner_id: string;

  // The listing being requested
  @ManyToOne(() => Listing)
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column({ type: 'uuid' })
  listing_id: string;

  // Optional: Listing offered in exchange (for exchange type)
  @ManyToOne(() => Listing, { nullable: true })
  @JoinColumn({ name: 'offered_listing_id' })
  offered_listing: Listing;

  @Column({ type: 'uuid', nullable: true })
  offered_listing_id: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'accepted', 'declined', 'completed', 'cancelled'],
    default: 'pending',
  })
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

  @Column({ type: 'text', nullable: true })
  requester_message: string;

  @Column({ type: 'text', nullable: true })
  owner_response: string;

  // Meetup details
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  meetup_location: Point;

  @Column({ type: 'varchar', length: 255, nullable: true })
  meetup_address: string;

  @Column({ type: 'timestamp', nullable: true })
  meetup_time: Date;

  @Column({ type: 'boolean', default: false })
  requester_confirmed_meetup: boolean;

  @Column({ type: 'boolean', default: false })
  owner_confirmed_meetup: boolean;

  // Completion
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
