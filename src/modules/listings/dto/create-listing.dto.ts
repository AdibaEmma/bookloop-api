import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  IsUUID,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateListingDto {
  @ApiProperty({ description: 'Book ID' })
  @IsUUID()
  book_id: string;

  @ApiProperty({
    description: 'Listing type',
    enum: ['exchange', 'donate', 'borrow'],
  })
  @IsEnum(['exchange', 'donate', 'borrow'])
  listing_type: 'exchange' | 'donate' | 'borrow';

  @ApiProperty({
    description: 'Book condition',
    enum: ['new', 'like_new', 'good', 'fair', 'poor'],
  })
  @IsEnum(['new', 'like_new', 'good', 'fair', 'poor'])
  book_condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';

  @ApiProperty({ description: 'Listing description', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ description: 'Address' })
  @IsString()
  @MaxLength(255)
  address: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty({ description: 'Region' })
  @IsString()
  @MaxLength(100)
  region: string;

  @ApiProperty({
    description: 'Search radius in kilometers',
    required: false,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  search_radius_km?: number;

  @ApiProperty({
    description: 'Preferred genres for exchange',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferred_genres?: string[];
}
