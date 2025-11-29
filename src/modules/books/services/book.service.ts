import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../entities/book.entity';
import type { IBookMetadataProvider } from '../interfaces/book-metadata-provider.interface';
import type { IImageUploadService } from '../../users/interfaces/image-upload.interface';
import { OpenLibraryService } from './open-library.service';

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
  private readonly logger = new Logger(BookService.name);

  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @Inject('IBookMetadataProvider')
    private readonly metadataProvider: IBookMetadataProvider,
    @Inject('IImageUploadService')
    private readonly imageUploadService: IImageUploadService,
    private readonly openLibraryService: OpenLibraryService,
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
   *
   * Implements intelligent caching flow:
   * 1. Check database cache (existing books)
   * 2. If not found, lookup Google Books for metadata
   * 3. Use Google Books cover if available, otherwise try OpenLibrary fallback
   * 4. If no cover found, use default placeholder
   * 5. Save merged result in database cache
   * 6. Return book metadata
   *
   * @param isbn - ISBN-10 or ISBN-13
   * @returns Created book with metadata
   */
  async createFromISBN(isbn: string): Promise<Book> {
    const cleanIsbn = this.cleanISBN(isbn);
    this.validateISBN(cleanIsbn);

    // Step 1: Check database cache first
    this.logger.debug(`[1] Cache check for ISBN: ${cleanIsbn}`);
    const existingBook = await this.bookRepository.findOne({
      where: { isbn: cleanIsbn },
    });

    if (existingBook) {
      this.logger.debug(`[1] Cache HIT - Returning: ${existingBook.title}`);
      return existingBook;
    }

    // Step 2: Lookup from Google Books
    this.logger.debug(`[2] Cache MISS - Looking up Google Books`);
    const metadata = await this.metadataProvider.lookupByISBN(cleanIsbn);

    if (!metadata) {
      throw new NotFoundException(
        `No book found for ISBN: ${isbn}. You can manually create the book.`,
      );
    }

    this.logger.debug(`[2] Google Books found: ${metadata.title}`);

    // Step 3: Use Google Books cover first, OpenLibrary as fallback
    let finalCoverImage = metadata.cover_image;

    if (!finalCoverImage) {
      this.logger.debug(`[3] No Google Books cover - trying OpenLibrary fallback`);
      const openLibraryCover = await this.openLibraryService.getCoverByISBN(cleanIsbn);
      if (openLibraryCover) {
        this.logger.debug(`[3] OpenLibrary cover found`);
        finalCoverImage = openLibraryCover;
      } else {
        this.logger.debug(`[4] No cover available - will use default`);
      }
    } else {
      this.logger.debug(`[3] Using Google Books cover`);
    }

    // Step 5: Save merged result in database cache
    this.logger.debug(`[5] Saving to cache: ${metadata.title}`);
    const book = this.bookRepository.create({
      isbn: metadata.isbn || cleanIsbn,
      title: metadata.title,
      author: metadata.author,
      description: metadata.description,
      cover_image: finalCoverImage,
      publisher: metadata.publisher,
      publication_year: metadata.publication_year,
      language: metadata.language || 'English',
      pages: metadata.pages,
      genre: metadata.genre,
      categories: metadata.categories,
      google_books_id: metadata.provider_id,
    });

    try {
      return await this.bookRepository.save(book);
    } catch (error: any) {
      // Handle race condition: if another request created the book at the same time
      if (error.code === '23505') {
        // PostgreSQL unique violation error code
        this.logger.debug(
          `[5] Race condition detected - book was created by another request. Fetching from cache...`,
        );
        const existingBook = await this.bookRepository.findOne({
          where: { isbn: cleanIsbn },
        });
        if (existingBook) {
          return existingBook;
        }
      }
      // Re-throw any other errors
      throw error;
    }
  }

  /**
   * Create book from Google Books ID
   *
   * Implements intelligent caching flow:
   * 1. Check database cache by google_books_id
   * 2. If not found, fetch from Google Books API using volume ID
   * 3. Use Google Books cover if available, otherwise try OpenLibrary fallback
   * 4. Save to database cache
   * 5. Return book
   *
   * @param googleBooksId - Google Books volume ID (e.g., "zyTCAlFPjgYC")
   * @param fallbackData - Fallback title/author if API lookup fails
   * @returns Created or existing book
   */
  async createFromGoogleBooksId(
    googleBooksId: string,
    fallbackData?: { title?: string; author?: string },
  ): Promise<Book> {
    // Step 1: Check database cache by google_books_id
    this.logger.debug(`[1] Cache check for Google Books ID: ${googleBooksId}`);
    const existingBook = await this.bookRepository.findOne({
      where: { google_books_id: googleBooksId },
    });

    if (existingBook) {
      this.logger.debug(`[1] Cache HIT - Returning: ${existingBook.title}`);
      return existingBook;
    }

    // Step 2: Fetch from Google Books API using volume ID
    this.logger.debug(`[2] Cache MISS - Fetching from Google Books API`);

    // Check if provider supports getBookById
    if (!this.metadataProvider.getBookById) {
      throw new BadRequestException(
        'Metadata provider does not support lookup by volume ID',
      );
    }

    const metadata = await this.metadataProvider.getBookById(googleBooksId);

    if (!metadata) {
      // Use fallback data if provided
      if (fallbackData?.title && fallbackData?.author) {
        this.logger.debug(`[2] API lookup failed - using fallback data`);
        const book = this.bookRepository.create({
          title: fallbackData.title,
          author: fallbackData.author,
          google_books_id: googleBooksId,
        });
        return this.bookRepository.save(book);
      }

      throw new NotFoundException(
        `Book not found for Google Books ID: ${googleBooksId}`,
      );
    }

    this.logger.debug(`[2] Google Books found: ${metadata.title}`);

    // Step 3: Use Google Books cover, OpenLibrary as fallback
    let finalCoverImage = metadata.cover_image;

    if (!finalCoverImage && metadata.isbn) {
      this.logger.debug(`[3] No Google Books cover - trying OpenLibrary fallback`);
      const openLibraryCover = await this.openLibraryService.getCoverByISBN(
        metadata.isbn,
      );
      if (openLibraryCover) {
        this.logger.debug(`[3] OpenLibrary cover found`);
        finalCoverImage = openLibraryCover;
      }
    }

    // Step 4: Save to database cache
    this.logger.debug(`[4] Saving to cache: ${metadata.title}`);
    const book = this.bookRepository.create({
      isbn: metadata.isbn,
      title: metadata.title,
      author: metadata.author,
      description: metadata.description,
      cover_image: finalCoverImage,
      publisher: metadata.publisher,
      publication_year: metadata.publication_year,
      language: metadata.language || 'English',
      pages: metadata.pages,
      genre: metadata.genre,
      categories: metadata.categories,
      google_books_id: googleBooksId,
    });

    try {
      return await this.bookRepository.save(book);
    } catch (error: any) {
      // Handle race condition
      if (error.code === '23505') {
        this.logger.debug(
          `[4] Race condition - fetching existing book from cache`,
        );
        const cachedBook = await this.bookRepository.findOne({
          where: { google_books_id: googleBooksId },
        });
        if (cachedBook) {
          return cachedBook;
        }
      }
      throw error;
    }
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

    // First check if query is an ISBN (all digits, 10 or 13 chars)
    const cleanQuery = query.replace(/[-\s]/g, '');
    const isISBN = /^\d{10}(\d{3})?$/.test(cleanQuery);

    if (isISBN) {
      // Direct ISBN search for exact match
      const book = await this.bookRepository.findOne({
        where: { isbn: cleanQuery },
      });

      if (book) {
        return { books: [book], total: 1 };
      }
    }

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
   * Get popular books (books with most listings)
   *
   * @param limit - Number of books to return
   * @returns Popular books
   */
  async getPopular(limit: number = 10): Promise<Book[]> {
    const books = await this.bookRepository
      .createQueryBuilder('book')
      .leftJoin('book.listings', 'listing')
      .addSelect('COUNT(listing.id)', 'listing_count')
      .groupBy('book.id')
      .orderBy('listing_count', 'DESC')
      .addOrderBy('book.created_at', 'DESC')
      .limit(limit)
      .getMany();

    return books;
  }

  /**
   * Get user's books (from their listings)
   *
   * @param userId - User ID
   * @returns Unique books from user's listings
   */
  async getUserBooks(userId: string): Promise<Book[]> {
    const books = await this.bookRepository
      .createQueryBuilder('book')
      .innerJoin('book.listings', 'listing')
      .where('listing.user_id = :userId', { userId })
      .groupBy('book.id')
      .orderBy('book.created_at', 'DESC')
      .getMany();

    return books;
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
