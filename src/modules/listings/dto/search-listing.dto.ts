import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchListingDto {
  @ApiProperty({ description: 'Search query (book title/author)', required: false })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({ description: 'Latitude for location search', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ description: 'Longitude for location search', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    description: 'Search radius in meters',
    required: false,
    example: 10000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(100000)
  radiusMeters?: number;

  @ApiProperty({
    description: 'Filter by listing type',
    enum: ['exchange', 'donate', 'borrow'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['exchange', 'donate', 'borrow'])
  listingType?: 'exchange' | 'donate' | 'borrow';

  @ApiProperty({
    description: 'Filter by condition',
    enum: ['new', 'like_new', 'good', 'fair', 'poor'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['new', 'like_new', 'good', 'fair', 'poor'])
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor';

  @ApiProperty({ description: 'Filter by genre', required: false })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiProperty({ description: 'Results limit', required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({ description: 'Results offset', required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}
