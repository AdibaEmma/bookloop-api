import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsPhoneNumber, MinLength, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    description:
      'Phone number in international format (the OTP was sent here by SMS)',
    example: '+233501234567',
  })
  @IsPhoneNumber('GH')
  phone: string;

  @ApiProperty({
    description: 'OTP code (6-8 characters, can be numeric or alphanumeric)',
    example: '123456',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(8)
  code: string;
}
