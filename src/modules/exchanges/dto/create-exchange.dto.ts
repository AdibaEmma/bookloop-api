import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
  IsDateString,
  ValidateNested,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Proposed meetup location during exchange request
 */
export class ProposedMeetupDto {
  @ApiProperty({ description: 'Meetup spot ID (if using verified spot)' })
  @IsOptional()
  @IsUUID()
  meetup_spot_id?: string;

  @ApiProperty({ description: 'Latitude of meetup location' })
  @IsNumber()
  @IsLatitude()
  latitude: number;

  @ApiProperty({ description: 'Longitude of meetup location' })
  @IsNumber()
  @IsLongitude()
  longitude: number;

  @ApiProperty({ description: 'Address of meetup location' })
  @IsString()
  @MaxLength(255)
  address: string;

  @ApiProperty({ description: 'Name of meetup location' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location_name?: string;
}

export class CreateExchangeDto {
  @ApiProperty({ description: 'Listing ID to request' })
  @IsUUID()
  listing_id: string;

  @ApiProperty({
    description: 'Optional: Listing offered in exchange',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  offered_listing_id?: string;

  @ApiProperty({ description: 'Message to owner', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @ApiProperty({
    description: 'Proposed meetup location',
    required: false,
    type: ProposedMeetupDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProposedMeetupDto)
  proposed_meetup?: ProposedMeetupDto;

  @ApiProperty({
    description: 'Proposed meetup date and time (ISO string)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  proposed_meetup_time?: string;
}
