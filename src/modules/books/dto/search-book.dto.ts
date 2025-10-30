import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsIn,
  MinLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for searching books
 */
export class SearchBookDto {
  @ApiProperty({
    description: 'Search query (title, author, or keyword)',
    example: 'odyssey homer',
  })
  @IsString()
  @MinLength(1, { message: 'Search query cannot be empty' })
  query: string;

  @ApiProperty({
    description: 'Maximum number of results',
    example: 20,
    required: false,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number;

  @ApiProperty({
    description: 'Number of results to skip (for pagination)',
    example: 0,
    required: false,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Offset cannot be negative' })
  offset?: number;

  @ApiProperty({
    description: 'Filter by genre',
    example: 'Fiction',
    required: false,
  })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiProperty({
    description: 'Filter by language',
    example: 'English',
    required: false,
  })
  @IsOptional()
  @IsString()
  language?: string;
}
