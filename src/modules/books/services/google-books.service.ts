/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
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
    const cleanIsbn = isbn.replace(/[-\s]/g, '');

    // 1) Google Books — now authenticated when GOOGLE_BOOKS_API_KEY is set
    //    (buildUrl appends the key). A keyless request gets a 0/day quota and 429s.
    try {
      const url = this.buildUrl('/volumes', { q: `isbn:${cleanIsbn}` });
      const { data } = await axios.get(url, { timeout: 8000 });
      if (data.items?.length) {
        return this.parseBookVolume(data.items[0]);
      }
      this.logger.debug(`Google Books: no result for ISBN ${cleanIsbn}`);
    } catch (error) {
      this.logQuotaAware(error, `ISBN ${cleanIsbn}`);
    }

    // 2) Open Library fallback — free, no key, no quota — so ISBN lookups keep
    //    working when Google Books is exhausted or unconfigured.
    const fallback = await this.lookupByISBNOpenLibrary(cleanIsbn);
    if (fallback) return fallback;

    this.logger.debug(`No book found for ISBN ${cleanIsbn} in any provider`);
    return null;
  }

  /** Free fallback: openlibrary.org book data by ISBN (no key, no quota). */
  private async lookupByISBNOpenLibrary(isbn: string): Promise<BookMetadata | null> {
    try {
      const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
      const { data } = await axios.get(url, { timeout: 8000 });
      const book = data?.[`ISBN:${isbn}`];
      if (!book) return null;

      const author =
        Array.isArray(book.authors) && book.authors.length
          ? book.authors.map((a: any) => a.name).filter(Boolean).join(', ')
          : 'Unknown Author';

      let publicationYear: number | undefined;
      const yearMatch = String(book.publish_date ?? '').match(/\d{4}/);
      if (yearMatch) publicationYear = parseInt(yearMatch[0], 10);

      const cover: string | undefined =
        book.cover?.large || book.cover?.medium || book.cover?.small;
      const categories = Array.isArray(book.subjects)
        ? book.subjects.slice(0, 5).map((s: any) => s.name).filter(Boolean)
        : [];

      this.logger.debug(`Open Library resolved ISBN ${isbn}`);
      return {
        isbn,
        title: book.title || 'Untitled',
        author,
        description: typeof book.notes === 'string' ? book.notes : undefined,
        cover_image: cover ? cover.replace('http://', 'https://') : undefined,
        publisher: book.publishers?.[0]?.name,
        publication_year: publicationYear,
        language: 'en',
        pages: book.number_of_pages,
        genre: categories[0],
        categories,
        provider_id: book.key,
        rating: undefined,
        ratings_count: undefined,
      };
    } catch (error: any) {
      this.logger.warn(`Open Library ISBN lookup failed for ${isbn}: ${error?.message}`);
      return null;
    }
  }

  /** Quota exhaustion (429) is expected and recoverable — log it as a warning,
   *  not an error dump, and let callers fall back. */
  private logQuotaAware(error: unknown, context: string): void {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 429) {
        this.logger.warn(
          `Google Books quota exhausted (429) for ${context} — set GOOGLE_BOOKS_API_KEY / enable the Books API for higher limits; using fallback.`,
        );
      } else {
        this.logger.warn(`Google Books error ${status} for ${context}: ${error.message}`);
      }
    } else {
      this.logger.warn(`Google Books lookup failed for ${context}: ${(error as Error).message}`);
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
    const maxResults = Math.min(options?.maxResults || 10, 40); // Cap at 40
    const startIndex = options?.startIndex || 0;

    try {
      const params: Record<string, string> = {
        q: query,
        maxResults: maxResults.toString(),
        startIndex: startIndex.toString(),
      };
      if (options?.language) {
        params.langRestrict = options.language;
      }

      const url = this.buildUrl('/volumes', params);
      const { data } = await axios.get(url, { timeout: 8000 });

      if (data.items?.length) {
        return data.items.map((item: any) => this.parseBookVolume(item));
      }
      this.logger.debug(`Google Books: no results for "${query}"`);
    } catch (error) {
      this.logQuotaAware(error, `search "${query}"`);
    }

    // Open Library fallback so search survives Google Books quota exhaustion.
    return this.searchBooksOpenLibrary(query, maxResults);
  }

  /** Free fallback: openlibrary.org search (no key, no quota). */
  private async searchBooksOpenLibrary(query: string, maxResults: number): Promise<BookMetadata[]> {
    try {
      const fields = 'title,author_name,cover_i,first_publish_year,isbn,key,subject,language';
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${maxResults}&fields=${fields}`;
      const { data } = await axios.get(url, { timeout: 8000 });
      const docs: any[] = Array.isArray(data?.docs) ? data.docs : [];
      if (docs.length) this.logger.debug(`Open Library search matched ${docs.length} for "${query}"`);

      return docs.map((d) => {
        const categories = Array.isArray(d.subject) ? d.subject.slice(0, 5) : [];
        return {
          isbn: Array.isArray(d.isbn) ? d.isbn[0] : undefined,
          title: d.title || 'Untitled',
          author: Array.isArray(d.author_name) ? d.author_name.join(', ') : 'Unknown Author',
          description: undefined,
          cover_image: d.cover_i
            ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`
            : undefined,
          publisher: undefined,
          publication_year: d.first_publish_year,
          language: Array.isArray(d.language) ? d.language[0] : 'en',
          pages: undefined,
          genre: categories[0],
          categories,
          provider_id: d.key,
          rating: undefined,
          ratings_count: undefined,
        };
      });
    } catch (error: any) {
      this.logger.warn(`Open Library search failed for "${query}": ${error?.message}`);
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
    // Best, safe cover image
    let coverImage: string | undefined;

    if (volumeInfo.imageLinks) {
      const links = volumeInfo.imageLinks;

      coverImage =
        links.extraLarge ||
        links.large ||
        links.medium ||
        links.thumbnail ||
        links.smallThumbnail ||
        undefined;

      if (coverImage) {
        // Always enforce HTTPS
        coverImage = coverImage.replace('http://', 'https://');

        // Optional safe upscale (zoom=1→zoom=2)
        if (coverImage.includes('zoom=')) {
          coverImage = coverImage.replace(/zoom=\d/, 'zoom=2');
        }
      }
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

      const { data } = await axios.get(url);

      return this.parseBookVolume(data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(
          `Google Books API error: ${error.response?.status} ${error.response?.statusText}`,
        );
      } else {
        this.logger.error(
          `Failed to get book by ID ${volumeId}: ${error.message}`,
        );
      }
      return null;
    }
  }
}
