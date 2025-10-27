import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsPhoneNumber, IsOptional, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
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

  @ApiProperty({
    description: 'Email address (optional)',
    example: 'kwame.mensah@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;
}
