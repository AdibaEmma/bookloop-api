import { PartialType } from '@nestjs/swagger';
import { CreateListingDto } from './create-listing.dto';
import { OmitType, ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

/**
 * DTO for updating listing
 * Omits book_id (cannot change book after creation)
 * Omits status (handled separately with broader enum)
 */
export class UpdateListingDto extends PartialType(
  OmitType(CreateListingDto, ['book_id', 'status'] as const),
) {
  @ApiProperty({
    description: 'Listing status',
    enum: ['draft', 'available', 'reserved', 'exchanged', 'expired', 'cancelled'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['draft', 'available', 'reserved', 'exchanged', 'expired', 'cancelled'])
  status?: 'draft' | 'available' | 'reserved' | 'exchanged' | 'expired' | 'cancelled';
}
