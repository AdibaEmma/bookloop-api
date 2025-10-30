import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

/**
 * DTO for updating user profile
 *
 * Validation Strategy:
 * - All fields are optional (partial updates)
 * - Validation only runs on provided fields
 * - Clear error messages for user feedback
 */
export class UpdateProfileDto {
  @ApiProperty({
    description: 'First name',
    example: 'Kwame',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  first_name?: string;

  @ApiProperty({
    description: 'Middle name',
    example: 'Nkrumah',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Middle name cannot exceed 50 characters' })
  middle_name?: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Mensah',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  last_name?: string;

  @ApiProperty({
    description: 'Email address',
    example: 'kwame.mensah@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  email?: string;

  @ApiProperty({
    description: 'User bio/description',
    example: 'Avid reader and book enthusiast from Accra',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Bio cannot exceed 500 characters' })
  bio?: string;

  @ApiProperty({
    description: 'Street address',
    example: '12 Independence Avenue',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Address cannot exceed 255 characters' })
  address?: string;

  @ApiProperty({
    description: 'City',
    example: 'Accra',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'City cannot exceed 100 characters' })
  city?: string;

  @ApiProperty({
    description: 'Region',
    example: 'Greater Accra',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Region cannot exceed 100 characters' })
  region?: string;
}
