import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../entities/book.entity';
import type { IBookMetadataProvider } from '../interfaces/book-metadata-provider.interface';
import type { IImageUploadService } from '../../users/interfaces/image-upload.interface';

/**
 * BookService
 *
 * Handles book catalog management and search.
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Handles book business logic only
 * - Dependency Inversion: Depends on interfaces (IBookMetadataProvider, IImageUploadService)
 * - Open/Closed: Easy to extend with new search methods
 *
 * Features:
 * - CRUD operations
 * - PostgreSQL Full-Text Search (FTS)
 * - ISBN lookup via Google Books
 * - Cover image management via Cloudinary
 */
@Injectable()
export class BookService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @Inject('IBookMetadataProvider')
    private readonly metadataProvider: IBookMetadataProvider,
    @Inject('IImageUploadService')
    private readonly imageUploadService: IImageUploadService,
  ) {}

  /**
   * Create a new book
   *
   * @param bookData - Book data
   * @returns Created book
   */
  async create(bookData: Partial<Book>): Promise<Book> {
    // Validate required fields
    if (!bookData.title || !bookData.author) {
      throw new BadRequestException('Title and author are required');
    }

    // Clean and validate ISBN if provided
    if (bookData.isbn) {
      bookData.isbn = this.cleanISBN(bookData.isbn);
      this.validateISBN(bookData.isbn);

      // Check if book with this ISBN already exists
      const existingBook = await this.bookRepository.findOne({
        where: { isbn: bookData.isbn },
      });

      if (existingBook) {
        throw new BadRequestException(
          `Book with ISBN ${bookData.isbn} already exists`,
        );
      }
    }

    const book = this.bookRepository.create(bookData);
    return this.bookRepository.save(book);
  }

  /**
   * Create book from ISBN lookup
   * Automatically fetches metadata from Google Books
   *
   * @param isbn - ISBN-10 or ISBN-13
   * @returns Created book with metadata
   */
  async createFromISBN(isbn: string): Promise<Book> {
    const cleanIsbn = this.cleanISBN(isbn);
    this.validateISBN(cleanIsbn);

    // Check if book already exists
    const existingBook = await this.bookRepository.findOne({
      where: { isbn: cleanIsbn },
    });

    if (existingBook) {
      return existingBook;
    }

    // Lookup metadata from Google Books
    const metadata = await this.metadataProvider.lookupByISBN(cleanIsbn);

    if (!metadata) {
      throw new NotFoundException(
        `No book found for ISBN: ${isbn}. You can manually create the book.`,
      );
    }

    // Create book with fetched metadata
    const book = this.bookRepository.create({
      isbn: metadata.isbn || cleanIsbn,
      title: metadata.title,
      author: metadata.author,
      description: metadata.description,
      cover_image: metadata.cover_image,
      publisher: metadata.publisher,
      publication_year: metadata.publication_year,
      language: metadata.language || 'English',
      pages: metadata.pages,
      genre: metadata.genre,
      categories: metadata.categories,
      google_books_id: metadata.provider_id,
    });

    return this.bookRepository.save(book);
  }

  /**
   * Find book by ID
   *
   * @param bookId - Book ID
   * @returns Book entity
   * @throws NotFoundException if book not found
   */
  async findById(bookId: string): Promise<Book> {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
    });

    if (!book) {
      throw new NotFoundException(`Book with ID ${bookId} not found`);
    }

    return book;
  }

  /**
   * Find book by ISBN
   *
   * @param isbn - ISBN-10 or ISBN-13
   * @returns Book entity or null
   */
  async findByISBN(isbn: string): Promise<Book | null> {
    const cleanIsbn = this.cleanISBN(isbn);

    return this.bookRepository.findOne({
      where: { isbn: cleanIsbn },
    });
  }

  /**
   * Search books using PostgreSQL Full-Text Search
   * Searches across title, author, and description fields
   *
   * @param query - Search query
   * @param options - Search options
   * @returns Array of books
   *
   * Implementation Note:
   * Uses PostgreSQL's built-in FTS with to_tsvector and plainto_tsquery.
   * For better performance, consider adding GIN index:
   * CREATE INDEX books_fts_idx ON books USING GIN (to_tsvector('english', title || ' ' || author || ' ' || COALESCE(description, '')));
   */
  async search(
    query: string,
    options?: {
      limit?: number;
      offset?: number;
      genre?: string;
      language?: string;
    },
  ): Promise<{ books: Book[]; total: number }> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    const limit = Math.min(options?.limit || 20, 100); // Cap at 100
    const offset = options?.offset || 0;

    // Build full-text search query
    let queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .where(
        `to_tsvector('english', book.title || ' ' || book.author || ' ' || COALESCE(book.description, '')) @@ plainto_tsquery('english', :query)`,
        { query },
      );

    // Add optional filters
    if (options?.genre) {
      queryBuilder = queryBuilder.andWhere('book.genre = :genre', {
        genre: options.genre,
      });
    }

    if (options?.language) {
      queryBuilder = queryBuilder.andWhere('book.language = :language', {
        language: options.language,
      });
    }

    // Add ranking for relevance sorting
    queryBuilder = queryBuilder
      .addSelect(
        `ts_rank(to_tsvector('english', book.title || ' ' || book.author || ' ' || COALESCE(book.description, '')), plainto_tsquery('english', :query))`,
        'rank',
      )
      .orderBy('rank', 'DESC')
      .skip(offset)
      .take(limit);

    // Execute query
    const [books, total] = await queryBuilder.getManyAndCount();

    return { books, total };
  }

  /**
   * Search books via Google Books API
   * Useful for discovering new books not yet in the catalog
   *
   * @param query - Search query
   * @param maxResults - Maximum results (default: 10, max: 40)
   * @returns Array of book metadata from Google Books
   */
  async searchGoogleBooks(
    query: string,
    maxResults: number = 10,
  ): Promise<any[]> {
    return this.metadataProvider.searchBooks(query, { maxResults });
  }

  /**
   * Update book
   *
   * @param bookId - Book ID
   * @param updateData - Partial book data
   * @returns Updated book
   */
  async update(bookId: string, updateData: Partial<Book>): Promise<Book> {
    // Verify book exists
    await this.findById(bookId);

    // Validate ISBN if being updated
    if (updateData.isbn) {
      updateData.isbn = this.cleanISBN(updateData.isbn);
      this.validateISBN(updateData.isbn);

      // Check if another book has this ISBN
      const existingBook = await this.bookRepository.findOne({
        where: { isbn: updateData.isbn },
      });

      if (existingBook && existingBook.id !== bookId) {
        throw new BadRequestException(
          `Another book with ISBN ${updateData.isbn} already exists`,
        );
      }
    }

    await this.bookRepository.update(bookId, updateData);

    return this.findById(bookId);
  }

  /**
   * Upload book cover image
   *
   * @param bookId - Book ID
   * @param imageBuffer - Image buffer
   * @returns Updated book with new cover image URL
   */
  async uploadCoverImage(bookId: string, imageBuffer: Buffer): Promise<Book> {
    const book = await this.findById(bookId);

    // Delete old cover if exists and it's a Cloudinary URL
    if (book.cover_image && book.cover_image.includes('cloudinary')) {
      const publicId = this.extractPublicIdFromUrl(book.cover_image);
      if (publicId) {
        await this.imageUploadService.deleteImage(publicId);
      }
    }

    // Upload new cover
    const uploadResult = await (
      this.imageUploadService as any
    ).uploadBookCover(imageBuffer, bookId);

    // Update book
    await this.bookRepository.update(bookId, {
      cover_image: uploadResult.secure_url || uploadResult.url,
    });

    return this.findById(bookId);
  }

  /**
   * Delete book (soft delete - keep for historical listings)
   *
   * @param bookId - Book ID
   */
  async delete(bookId: string): Promise<void> {
    const book = await this.findById(bookId);

    // Note: We're doing a hard delete here.
    // Consider implementing soft delete if you want to keep book data
    // for historical listings/exchanges
    await this.bookRepository.delete(book.id);
  }

  /**
   * Get all unique genres from books
   *
   * @returns Array of genre strings
   */
  async getAllGenres(): Promise<string[]> {
    const result = await this.bookRepository
      .createQueryBuilder('book')
      .select('DISTINCT book.genre', 'genre')
      .where('book.genre IS NOT NULL')
      .orderBy('book.genre', 'ASC')
      .getRawMany();

    return result.map((row) => row.genre);
  }

  /**
   * Get all unique languages from books
   *
   * @returns Array of language strings
   */
  async getAllLanguages(): Promise<string[]> {
    const result = await this.bookRepository
      .createQueryBuilder('book')
      .select('DISTINCT book.language', 'language')
      .where('book.language IS NOT NULL')
      .orderBy('book.language', 'ASC')
      .getRawMany();

    return result.map((row) => row.language);
  }

  /**
   * Clean ISBN (remove hyphens and spaces)
   *
   * @param isbn - Raw ISBN
   * @returns Cleaned ISBN
   */
  private cleanISBN(isbn: string): string {
    return isbn.replace(/[-\s]/g, '');
  }

  /**
   * Validate ISBN format
   * Supports ISBN-10 and ISBN-13
   *
   * @param isbn - Cleaned ISBN
   * @throws BadRequestException if invalid
   */
  private validateISBN(isbn: string): void {
    // ISBN-10: 10 digits
    // ISBN-13: 13 digits
    if (isbn.length !== 10 && isbn.length !== 13) {
      throw new BadRequestException(
        'Invalid ISBN format. Must be 10 or 13 digits.',
      );
    }

    // Check all characters are digits (except last char of ISBN-10 can be 'X')
    const pattern =
      isbn.length === 10 ? /^[0-9]{9}[0-9X]$/i : /^[0-9]{13}$/;

    if (!pattern.test(isbn)) {
      throw new BadRequestException(
        'Invalid ISBN format. Must contain only digits.',
      );
    }

    // TODO: Add checksum validation for production
    // ISBN-10 checksum: https://en.wikipedia.org/wiki/ISBN#ISBN-10_check_digit_calculation
    // ISBN-13 checksum: https://en.wikipedia.org/wiki/ISBN#ISBN-13_check_digit_calculation
  }

  /**
   * Extract public_id from Cloudinary URL
   *
   * @param url - Cloudinary URL
   * @returns Public ID or null
   */
  private extractPublicIdFromUrl(url: string): string | null {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return match ? match[1] : null;
  }
}
