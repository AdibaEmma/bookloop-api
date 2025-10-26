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
import { Book } from '../../books/entities/book.entity';

@Entity('listings')
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => Book)
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ type: 'uuid' })
  book_id: string;

  @Column({
    type: 'enum',
    enum: ['exchange', 'donate', 'borrow'],
  })
  listing_type: 'exchange' | 'donate' | 'borrow';

  @Column({
    type: 'enum',
    enum: ['new', 'like_new', 'good', 'fair', 'poor'],
  })
  book_condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-array', nullable: true })
  images: string[];

  // Location data
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: Point;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 100 })
  region: string;

  // Search radius in kilometers
  @Column({ type: 'int', default: 10 })
  search_radius_km: number;

  // Preferred exchange genres (for exchange type)
  @Column({ type: 'simple-array', nullable: true })
  preferred_genres: string[];

  @Column({
    type: 'enum',
    enum: ['available', 'reserved', 'exchanged', 'expired', 'cancelled'],
    default: 'available',
  })
  status: 'available' | 'reserved' | 'exchanged' | 'expired' | 'cancelled';

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;

  @Column({ type: 'int', default: 0 })
  views_count: number;

  @Column({ type: 'int', default: 0 })
  interest_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
