import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { DeviceType } from '../entities/user-device.entity';

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'Firebase Cloud Messaging token or Expo push token',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @IsNotEmpty()
  @IsString()
  fcm_token: string;

  @ApiProperty({
    description: 'Type of device',
    enum: ['ios', 'android', 'web'],
    example: 'ios',
  })
  @IsNotEmpty()
  @IsIn(['ios', 'android', 'web'])
  device_type: DeviceType;

  @ApiProperty({
    description: 'Device name/model (optional)',
    example: 'iPhone 14 Pro',
    required: false,
  })
  @IsOptional()
  @IsString()
  device_name?: string;
}
