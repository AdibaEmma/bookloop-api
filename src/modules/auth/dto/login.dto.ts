import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email address',
    example: 'kwame.mensah@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password (optional) - if provided, login with password; if not, OTP will be sent',
    example: 'SecureP@ssw0rd',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
