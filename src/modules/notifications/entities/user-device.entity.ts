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

export enum DeviceType {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

@Entity('user_devices')
@Index(['user_id'])
@Index(['fcm_token'], { unique: true })
export class UserDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 500, unique: true })
  fcm_token: string;

  @Column({
    type: 'enum',
    enum: DeviceType,
  })
  device_type: DeviceType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  device_name: string;

  @Column({ type: 'timestamptz', nullable: true })
  last_active_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
