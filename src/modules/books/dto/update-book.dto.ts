import { PartialType } from '@nestjs/swagger';
import { CreateBookDto } from './create-book.dto';

/**
 * DTO for updating a book
 * All fields from CreateBookDto are optional
 */
export class UpdateBookDto extends PartialType(CreateBookDto) {}
