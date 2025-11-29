import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class AddPreferenceDto {
  @ApiProperty({ description: 'Book ID to add as preference' })
  @IsUUID()
  book_id: string;

  @ApiProperty({
    description: 'Priority (1 = highest, 2, 3 = lowest)',
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  priority?: number;
}
