import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MeetupSpotCategory {
  MALL = 'mall',
  LIBRARY = 'library',
  CAFE = 'cafe',
  PARK = 'park',
  UNIVERSITY = 'university',
  METRO_STATION = 'metro_station',
  COMMUNITY_CENTER = 'community_center',
  BOOKSTORE = 'bookstore',
  OTHER = 'other',
}

@Entity('meetup_spots')
@Index(['city'])
@Index(['category'])
@Index(['is_active'])
export class MeetupSpot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500 })
  address: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: string;

  @Column({
    type: 'enum',
    enum: MeetupSpotCategory,
    default: MeetupSpotCategory.OTHER,
  })
  category: MeetupSpotCategory;

  @Column({ type: 'varchar', length: 20, nullable: true })
  opening_time: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  closing_time: string;

  @Column({ type: 'text', nullable: true })
  operating_hours: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_featured: boolean;

  @Column({ type: 'int', default: 0 })
  usage_count: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
