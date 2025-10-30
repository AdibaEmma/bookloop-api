import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { BooksController } from './books.controller';
import { BookService } from './services/book.service';
import { GoogleBooksService } from './services/google-books.service';
import { UsersModule } from '../users/users.module';

/**
 * BooksModule
 *
 * Provides book catalog management functionality.
 *
 * Providers:
 * - BookService: Book business logic and FTS search
 * - GoogleBooksService: Google Books API integration (Provider pattern)
 *
 * Imports:
 * - UsersModule: For IImageUploadService (cover image uploads)
 *
 * Exports:
 * - BookService: For use in ListingsModule
 */
@Module({
  imports: [TypeOrmModule.forFeature([Book]), UsersModule],
  controllers: [BooksController],
  providers: [
    BookService,
    GoogleBooksService,
    // Provider binding for IBookMetadataProvider interface
    {
      provide: 'IBookMetadataProvider',
      useClass: GoogleBooksService,
    },
  ],
  exports: [TypeOrmModule, BookService],
})
export class BooksModule {}
