import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Email address',
    example: 'kwame.mensah@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'OTP code (6-8 characters, can be numeric or alphanumeric)',
    example: '123456',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(8)
  code: string;
}
