import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsPhoneNumber,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * Verify an OTP sent to a phone (SMS) or an email. Exactly one of phone/email
 * is provided — matching the channel the code was sent over.
 */
export class VerifyOtpDto {
  @ApiProperty({
    description: 'Phone number the OTP was sent to (phone OR email required)',
    example: '+233501234567',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber('GH')
  phone?: string;

  @ApiProperty({
    description: 'Email the OTP was sent to (phone OR email required)',
    example: 'kwame.mensah@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'OTP code (6-8 characters, can be numeric or alphanumeric)',
    example: '123456',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(8)
  code: string;
}
