import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

/**
 * Manual Ghana Card submission. The number is stored and left pending
 * (ghana_card_verified = false) until an admin approves it. Automated
 * SourceID verification can be layered on later.
 */
export class SubmitGhanaCardDto {
  @ApiProperty({
    description: 'Ghana Card (National ID) number, format GHA-XXXXXXXXX-X',
    example: 'GHA-123456789-0',
  })
  @IsString()
  @Matches(/^GHA-\d{9}-\d$/i, {
    message: 'Ghana Card number must look like GHA-123456789-0',
  })
  ghana_card_number: string;
}
