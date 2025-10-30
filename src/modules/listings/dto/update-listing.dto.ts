import { PartialType } from '@nestjs/swagger';
import { CreateListingDto } from './create-listing.dto';
import { OmitType } from '@nestjs/swagger';

/**
 * DTO for updating listing
 * Omits book_id (cannot change book after creation)
 */
export class UpdateListingDto extends PartialType(
  OmitType(CreateListingDto, ['book_id'] as const),
) {}
