import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

/**
 * DTO for creating a book from Google Books ID
 * Automatically fetches metadata from Google Books API using the volume ID
 *
 * @example
 * {
 *   "googleBooksId": "zyTCAlFPjgYC",
 *   "title": "The Hobbit",        // Fallback if API fails
 *   "author": "J.R.R. Tolkien"    // Fallback if API fails
 * }
 */
export class CreateBookFromGoogleDto {
  @ApiProperty({
    description: 'Google Books volume ID',
    example: 'zyTCAlFPjgYC',
  })
  @IsString()
  @MinLength(1, { message: 'Google Books ID cannot be empty' })
  googleBooksId: string;

  @ApiPropertyOptional({
    description: 'Fallback title if Google Books lookup fails',
    example: 'The Hobbit',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Fallback author if Google Books lookup fails',
    example: 'J.R.R. Tolkien',
  })
  @IsString()
  @IsOptional()
  author?: string;
}
