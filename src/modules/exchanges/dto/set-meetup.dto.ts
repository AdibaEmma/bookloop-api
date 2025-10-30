import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class SetMeetupDto {
  @ApiProperty({ description: 'Meetup latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Meetup longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ description: 'Meetup address' })
  @IsString()
  @MaxLength(255)
  address: string;

  @ApiProperty({ description: 'Meetup time (ISO 8601)' })
  @IsDateString()
  meetup_time: string;
}
