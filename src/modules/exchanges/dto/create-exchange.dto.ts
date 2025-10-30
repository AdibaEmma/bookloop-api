import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
