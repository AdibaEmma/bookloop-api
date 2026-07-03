import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber } from 'class-validator';

export class ResendOtpDto {
  @ApiProperty({
    description: 'Phone number in international format to resend the SMS OTP to',
    example: '+233501234567',
  })
  @IsPhoneNumber('GH')
  phone: string;
}
