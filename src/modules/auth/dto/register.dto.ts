import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsPhoneNumber, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Email address (optional — phone is the primary identifier)',
    example: 'kwame.mensah@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Password (optional) - if not provided, user will login via OTP only',
    example: 'SecureP@ssw0rd',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password?: string;

  @ApiProperty({
    description: 'Phone number in international format',
    example: '+233501234567',
  })
  @IsPhoneNumber('GH')
  phone: string;

  @ApiProperty({
    description: 'First name',
    example: 'Kwame',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  first_name: string;

  @ApiProperty({
    description: 'Middle name (optional)',
    example: 'Kofi',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  middle_name?: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Mensah',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  last_name: string;
}
