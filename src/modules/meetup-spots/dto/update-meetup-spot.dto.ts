import { PartialType } from '@nestjs/swagger';
import { CreateMeetupSpotDto } from './create-meetup-spot.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMeetupSpotDto extends PartialType(CreateMeetupSpotDto) {
  @ApiProperty({
    description: 'Whether the spot is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    description: 'Whether the spot is featured',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;
}
