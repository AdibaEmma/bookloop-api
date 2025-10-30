import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * DTO for creating a book from ISBN lookup
 * Automatically fetches metadata from Google Books
 */
export class CreateBookFromISBNDto {
  @ApiProperty({
    description: 'ISBN-10 or ISBN-13',
    example: '9780140449136',
  })
  @IsString()
  @MinLength(10, { message: 'ISBN must be at least 10 characters' })
  @MaxLength(13, { message: 'ISBN cannot exceed 13 characters' })
  isbn: string;
}
