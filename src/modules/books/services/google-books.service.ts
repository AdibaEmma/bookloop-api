import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IBookMetadataProvider,
  BookMetadata,
} from '../interfaces/book-metadata-provider.interface';

/**
 * Google Books API Implementation
 *
 * SOLID Principles Applied:
 * - Dependency Inversion: Implements IBookMetadataProvider
 * - Single Responsibility: Only handles Google Books API interactions
 *
 * Google Books API Documentation:
 * https://developers.google.com/books/docs/v1/using
 *
 * Configuration Required:
 * - GOOGLE_BOOKS_API_KEY (optional, but recommended for higher rate limits)
 *
 * Rate Limits:
 * - Without API key: 1000 requests/day
 * - With API key: 10,000 requests/day
 */
@Injectable()
export class GoogleBooksService implements IBookMetadataProvider {
  private readonly logger = new Logger(GoogleBooksService.name);
  private readonly baseUrl = 'https://www.googleapis.com/books/v1';
  private readonly apiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_BOOKS_API_KEY');

    if (!this.apiKey) {
      this.logger.warn(
        'GOOGLE_BOOKS_API_KEY not configured. Using API without key (lower rate limits)',
      );
    }
  }

  /**
   * Look up book by ISBN
   *
   * @param isbn - ISBN-10 or ISBN-13
   * @returns Book metadata or null if not found
   */
  async lookupByISBN(isbn: string): Promise<BookMetadata | null> {
    try {
      // Clean ISBN (remove hyphens and spaces)
      const cleanIsbn = isbn.replace(/[-\s]/g, '');

      // Search by ISBN using Google Books API
      const url = this.buildUrl('/volumes', {
        q: `isbn:${cleanIsbn}`,
        maxResults: '1',
      });

      const response = await fetch(url);

      if (!response.ok) {
        this.logger.error(
          `Google Books API error: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        this.logger.debug(`No book found for ISBN: ${isbn}`);
        return null;
      }

      // Parse first result
      return this.parseBookVolume(data.items[0]);
    } catch (error) {
      this.logger.error(`Failed to lookup ISBN ${isbn}: ${error.message}`);
      return null;
    }
  }

  /**
   * Search for books by query string
   *
   * @param query - Search query (title, author, keyword)
   * @param options - Search options
   * @returns Array of book metadata
   */
  async searchBooks(
    query: string,
    options?: {
      maxResults?: number;
      language?: string;
      startIndex?: number;
    },
  ): Promise<BookMetadata[]> {
    try {
      const maxResults = Math.min(options?.maxResults || 10, 40); // Cap at 40
      const startIndex = options?.startIndex || 0;

      const params: Record<string, string> = {
        q: query,
        maxResults: maxResults.toString(),
        startIndex: startIndex.toString(),
      };

      if (options?.language) {
        params.langRestrict = options.language;
      }

      const url = this.buildUrl('/volumes', params);

      const response = await fetch(url);

      if (!response.ok) {
        this.logger.error(
          `Google Books API error: ${response.status} ${response.statusText}`,
        );
        return [];
      }

      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return [];
      }

      // Parse all results
      return data.items.map((item: any) => this.parseBookVolume(item));
    } catch (error) {
      this.logger.error(`Failed to search books: ${error.message}`);
      return [];
    }
  }

  /**
   * Get provider name
   *
   * @returns "Google Books"
   */
  getProviderName(): string {
    return 'Google Books';
  }

  /**
   * Build API URL with query parameters
   *
   * @param path - API path
   * @param params - Query parameters
   * @returns Full URL
   */
  private buildUrl(path: string, params: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${path}`);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    // Add API key if available
    if (this.apiKey) {
      url.searchParams.append('key', this.apiKey);
    }

    return url.toString();
  }

  /**
   * Parse Google Books volume to BookMetadata
   *
   * Google Books API Response Format:
   * {
   *   id: string,
   *   volumeInfo: {
   *     title: string,
   *     authors: string[],
   *     publisher: string,
   *     publishedDate: string,
   *     description: string,
   *     industryIdentifiers: [{type: "ISBN_13", identifier: string}],
   *     pageCount: number,
   *     categories: string[],
   *     imageLinks: {thumbnail: string, smallThumbnail: string},
   *     language: string,
   *     averageRating: number,
   *     ratingsCount: number
   *   }
   * }
   *
   * @param volume - Google Books volume object
   * @returns Parsed BookMetadata
   */
  private parseBookVolume(volume: any): BookMetadata {
    const volumeInfo = volume.volumeInfo || {};

    // Extract ISBN (prefer ISBN-13 over ISBN-10)
    let isbn: string | undefined;
    if (volumeInfo.industryIdentifiers) {
      const isbn13 = volumeInfo.industryIdentifiers.find(
        (id: any) => id.type === 'ISBN_13',
      );
      const isbn10 = volumeInfo.industryIdentifiers.find(
        (id: any) => id.type === 'ISBN_10',
      );
      isbn = isbn13?.identifier || isbn10?.identifier;
    }

    // Extract authors (join multiple authors with comma)
    const author = volumeInfo.authors
      ? volumeInfo.authors.join(', ')
      : 'Unknown Author';

    // Extract publication year from publishedDate (format: YYYY-MM-DD or YYYY)
    let publicationYear: number | undefined;
    if (volumeInfo.publishedDate) {
      const year = parseInt(volumeInfo.publishedDate.substring(0, 4), 10);
      if (!isNaN(year)) {
        publicationYear = year;
      }
    }

    // Get best quality cover image
    let coverImage: string | undefined;
    if (volumeInfo.imageLinks) {
      // Prefer larger images, remove zoom=1 parameter for higher quality
      coverImage = (
        volumeInfo.imageLinks.large ||
        volumeInfo.imageLinks.medium ||
        volumeInfo.imageLinks.thumbnail ||
        volumeInfo.imageLinks.smallThumbnail
      )?.replace('&edge=curl', '').replace('zoom=1', 'zoom=0');
    }

    // Extract primary genre from categories
    const genre = volumeInfo.categories?.[0];

    return {
      isbn,
      title: volumeInfo.title || 'Untitled',
      author,
      description: volumeInfo.description,
      cover_image: coverImage,
      publisher: volumeInfo.publisher,
      publication_year: publicationYear,
      language: volumeInfo.language || 'en',
      pages: volumeInfo.pageCount,
      genre,
      categories: volumeInfo.categories || [],
      provider_id: volume.id, // Google Books ID
      rating: volumeInfo.averageRating,
      ratings_count: volumeInfo.ratingsCount,
    };
  }

  /**
   * Get book details by Google Books ID
   *
   * @param volumeId - Google Books volume ID
   * @returns Book metadata or null if not found
   */
  async getBookById(volumeId: string): Promise<BookMetadata | null> {
    try {
      const url = this.buildUrl(`/volumes/${volumeId}`, {});

      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return this.parseBookVolume(data);
    } catch (error) {
      this.logger.error(
        `Failed to get book by ID ${volumeId}: ${error.message}`,
      );
      return null;
    }
  }
}
