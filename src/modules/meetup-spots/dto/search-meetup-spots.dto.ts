import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MeetupSpotCategory } from '../entities/meetup-spot.entity';

export class SearchMeetupSpotsDto {
  @ApiProperty({
    description: 'User latitude for proximity search',
    example: 5.6037,
    minimum: -90,
    maximum: 90,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    description: 'User longitude for proximity search',
    example: -0.187,
    minimum: -180,
    maximum: 180,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    description: 'Search radius in kilometers',
    example: 5,
    minimum: 0.1,
    maximum: 50,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radius?: number;

  @ApiProperty({
    description: 'Filter by city',
    example: 'Accra',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    description: 'Filter by category',
    enum: MeetupSpotCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(MeetupSpotCategory)
  category?: MeetupSpotCategory;

  @ApiProperty({
    description: 'Number of results to return',
    example: 20,
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({
    description: 'Number of results to skip',
    example: 0,
    default: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number;
}
