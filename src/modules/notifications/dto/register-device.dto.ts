import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DeviceType } from '../entities/user-device.entity';

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'Firebase Cloud Messaging token',
    example: 'dGhpcyBpcyBhIGZha2UgZmNtIHRva2Vu...',
  })
  @IsNotEmpty()
  @IsString()
  fcm_token: string;

  @ApiProperty({
    description: 'Type of device',
    enum: DeviceType,
    example: DeviceType.IOS,
  })
  @IsNotEmpty()
  @IsEnum(DeviceType)
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
