import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MeetupSpotCategory } from '../entities/meetup-spot.entity';

export class CreateMeetupSpotDto {
  @ApiProperty({
    description: 'Name of the meetup spot',
    example: 'Accra Mall Food Court',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Description of the meetup spot',
    example: 'Main entrance near food court area',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Physical address',
    example: 'Tetteh Quarshie Interchange, Accra',
  })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({
    description: 'City name',
    example: 'Accra',
  })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({
    description: 'Region name',
    example: 'Greater Accra Region',
    required: false,
  })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({
    description: 'Latitude',
    example: 5.6037,
    minimum: -90,
    maximum: 90,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude',
    example: -0.187,
    minimum: -180,
    maximum: 180,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    description: 'Category of the meetup spot',
    enum: MeetupSpotCategory,
    example: MeetupSpotCategory.MALL,
  })
  @IsNotEmpty()
  @IsEnum(MeetupSpotCategory)
  category: MeetupSpotCategory;

  @ApiProperty({
    description: 'Opening time (24h format)',
    example: '08:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  opening_time?: string;

  @ApiProperty({
    description: 'Closing time (24h format)',
    example: '22:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  closing_time?: string;

  @ApiProperty({
    description: 'Operating hours description',
    example: 'Monday-Saturday: 8AM-10PM, Sunday: 10AM-8PM',
    required: false,
  })
  @IsOptional()
  @IsString()
  operating_hours?: string;
}
