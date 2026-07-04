import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsPhoneNumber,
  IsEmail,
  MinLength,
} from 'class-validator';

/**
 * Login accepts either a phone number or an email as the identifier (at least
 * one is required — enforced in the service). Phone is the primary path for the
 * mobile app; email keeps existing/admin accounts working.
 */
export class LoginDto {
  @ApiProperty({
    description: 'Phone number in international format (phone OR email required)',
    example: '+233501234567',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber('GH')
  phone?: string;

  @ApiProperty({
    description: 'Email address (phone OR email required)',
    example: 'kwame.mensah@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description:
      'Password (optional) - if provided, login with password; if not, an OTP is sent to the phone (SMS) or email',
    example: 'SecureP@ssw0rd',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
