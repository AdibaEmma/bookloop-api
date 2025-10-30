import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO for creating a book manually
 */
export class CreateBookDto {
  @ApiProperty({
    description: 'ISBN-10 or ISBN-13',
    example: '9780140449136',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'ISBN must be at least 10 characters' })
  @MaxLength(13, { message: 'ISBN cannot exceed 13 characters' })
  isbn?: string;

  @ApiProperty({
    description: 'Book title',
    example: 'The Odyssey',
  })
  @IsString()
  @MinLength(1, { message: 'Title cannot be empty' })
  @MaxLength(255, { message: 'Title cannot exceed 255 characters' })
  title: string;

  @ApiProperty({
    description: 'Author name',
    example: 'Homer',
  })
  @IsString()
  @MinLength(1, { message: 'Author cannot be empty' })
  @MaxLength(255, { message: 'Author cannot exceed 255 characters' })
  author: string;

  @ApiProperty({
    description: 'Book description',
    example: 'An epic poem in 24 books traditionally attributed to Homer.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Cover image URL',
    example: 'https://example.com/cover.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  cover_image?: string;

  @ApiProperty({
    description: 'Publisher name',
    example: 'Penguin Classics',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Publisher cannot exceed 100 characters' })
  publisher?: string;

  @ApiProperty({
    description: 'Year of publication',
    example: 1996,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1000, { message: 'Publication year must be at least 1000' })
  @Max(new Date().getFullYear() + 1, { message: 'Publication year cannot be in the future' })
  publication_year?: number;

  @ApiProperty({
    description: 'Language',
    example: 'English',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Language cannot exceed 50 characters' })
  language?: string;

  @ApiProperty({
    description: 'Number of pages',
    example: 324,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Pages must be at least 1' })
  pages?: number;

  @ApiProperty({
    description: 'Book genre',
    example: 'Epic Poetry',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Genre cannot exceed 100 characters' })
  genre?: string;

  @ApiProperty({
    description: 'Categories/subjects',
    example: ['Fiction', 'Classics', 'Epic Poetry'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}
