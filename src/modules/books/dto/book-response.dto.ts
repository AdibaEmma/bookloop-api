import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * DTO for book responses
 */
@Exclude()
export class BookResponseDto {
  @Expose()
  @ApiProperty({ description: 'Book ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'ISBN', required: false })
  isbn?: string;

  @Expose()
  @ApiProperty({ description: 'Book title' })
  title: string;

  @Expose()
  @ApiProperty({ description: 'Author name' })
  author: string;

  @Expose()
  @ApiProperty({ description: 'Book description', required: false })
  description?: string;

  @Expose()
  @ApiProperty({ description: 'Cover image URL', required: false })
  cover_image?: string;

  @Expose()
  @ApiProperty({ description: 'Publisher', required: false })
  publisher?: string;

  @Expose()
  @ApiProperty({ description: 'Publication year', required: false })
  publication_year?: number;

  @Expose()
  @ApiProperty({ description: 'Language', required: false })
  language?: string;

  @Expose()
  @ApiProperty({ description: 'Number of pages', required: false })
  pages?: number;

  @Expose()
  @ApiProperty({ description: 'Genre', required: false })
  genre?: string;

  @Expose()
  @ApiProperty({ description: 'Categories', type: [String], required: false })
  categories?: string[];

  @Expose()
  @ApiProperty({ description: 'Google Books ID', required: false })
  google_books_id?: string;

  @Expose()
  @ApiProperty({ description: 'Creation timestamp' })
  created_at: Date;

  @Expose()
  @ApiProperty({ description: 'Last update timestamp' })
  updated_at: Date;
}

/**
 * DTO for search response with pagination
 */
export class SearchBooksResponseDto {
  @ApiProperty({ description: 'Array of books', type: [BookResponseDto] })
  books: BookResponseDto[];

  @ApiProperty({ description: 'Total number of results' })
  total: number;

  @ApiProperty({ description: 'Number of results per page' })
  limit: number;

  @ApiProperty({ description: 'Number of results skipped' })
  offset: number;
}
