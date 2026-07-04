import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsEmail, IsOptional } from 'class-validator';

/**
 * Resend an OTP to a phone (SMS) or email — matching how the user is
 * authenticating. Exactly one of phone/email is provided.
 */
export class ResendOtpDto {
  @ApiProperty({
    description: 'Phone number to resend the SMS OTP to (phone OR email required)',
    example: '+233501234567',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber('GH')
  phone?: string;

  @ApiProperty({
    description: 'Email to resend the OTP to (phone OR email required)',
    example: 'kwame.mensah@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}
