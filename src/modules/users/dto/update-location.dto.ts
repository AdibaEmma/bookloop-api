import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

/**
 * DTO for updating user location
 *
 * Location Format:
 * - Uses decimal degrees for latitude and longitude
 * - Follows PostGIS standards
 * - Optional address fields for human-readable location
 */
export class UpdateLocationDto {
  @ApiProperty({
    description: 'Latitude coordinate (decimal degrees)',
    example: 5.6037,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber({}, { message: 'Latitude must be a valid number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate (decimal degrees)',
    example: -0.1870,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber({}, { message: 'Longitude must be a valid number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  longitude: number;

  @ApiProperty({
    description: 'Human-readable address',
    example: '12 Independence Avenue, Accra',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Address cannot exceed 255 characters' })
  address?: string;

  @ApiProperty({
    description: 'City name',
    example: 'Accra',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'City cannot exceed 100 characters' })
  city?: string;

  @ApiProperty({
    description: 'Region name',
    example: 'Greater Accra',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Region cannot exceed 100 characters' })
  region?: string;
}
