import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsPhoneNumber, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Phone number in international format',
    example: '+233501234567',
  })
  @IsPhoneNumber('GH')
  phone: string;

  @ApiProperty({
    description:
      'Password (optional) - if provided, login with password; if not, an OTP is sent by SMS',
    example: 'SecureP@ssw0rd',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
