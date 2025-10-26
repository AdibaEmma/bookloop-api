import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { Point } from 'geojson';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  first_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  middle_name: string;

  @Column({ type: 'varchar', length: 50 })
  last_name: string;

  // Virtual property for full name
  get full_name(): string {
    const parts = [this.first_name, this.middle_name, this.last_name].filter(Boolean);
    return parts.join(' ');
  }

  set full_name(name: string) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      this.first_name = parts[0];
      this.last_name = parts[0];
    } else if (parts.length === 2) {
      this.first_name = parts[0];
      this.last_name = parts[1];
    } else {
      this.first_name = parts[0];
      this.middle_name = parts.slice(1, -1).join(' ');
      this.last_name = parts[parts.length - 1];
    }
  }

  @Column({ type: 'varchar', length: 15, unique: true })
  phone_number: string;

  @Column({ type: 'boolean', default: false })
  phone_verified: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email: string;

  @Column({ type: 'boolean', default: false })
  email_verified: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profile_picture: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: Point;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string;

  @Column({ type: 'varchar', length: 100, default: 'Ghana' })
  country: string;

  // Ghana Card Verification
  @Column({ type: 'varchar', length: 20, nullable: true })
  ghana_card_number: string;

  @Column({ type: 'boolean', default: false })
  ghana_card_verified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  ghana_card_verified_at: Date;

  // Subscription
  @Column({
    type: 'enum',
    enum: ['free', 'basic', 'premium'],
    default: 'free',
  })
  subscription_tier: 'free' | 'basic' | 'premium';

  @Column({ type: 'timestamp', nullable: true })
  subscription_expires_at: Date;

  // User Stats
  @Column({ type: 'int', default: 0 })
  total_exchanges: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  total_ratings: number;

  // Account Status
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_banned: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_login_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
