/**
 * Book Metadata Provider Interface
 *
 * SOLID Principles Applied:
 * - Dependency Inversion: Depend on abstraction, not concrete Google Books implementation
 * - Open/Closed: Easy to add new providers (OpenLibrary, WorldCat, etc.)
 *
 * Benefits:
 * - Swap providers without changing business logic
 * - Easy to mock for testing
 * - Clear contract for metadata providers
 *
 * Design Pattern: Provider Pattern (similar to OTP providers)
 */

export interface BookMetadata {
  /**
   * ISBN-10 or ISBN-13
   */
  isbn?: string;

  /**
   * Book title
   */
  title: string;

  /**
   * Author(s), comma-separated if multiple
   */
  author: string;

  /**
   * Book description/summary
   */
  description?: string;

  /**
   * Cover image URL
   */
  cover_image?: string;

  /**
   * Publisher name
   */
  publisher?: string;

  /**
   * Year of publication
   */
  publication_year?: number;

  /**
   * Language code (e.g., "en", "fr")
   */
  language?: string;

  /**
   * Number of pages
   */
  pages?: number;

  /**
   * Genre/category
   */
  genre?: string;

  /**
   * Array of categories/subjects
   */
  categories?: string[];

  /**
   * Provider-specific ID (e.g., Google Books ID)
   */
  provider_id?: string;

  /**
   * Average rating (0-5)
   */
  rating?: number;

  /**
   * Number of ratings
   */
  ratings_count?: number;
}

export interface IBookMetadataProvider {
  /**
   * Look up book metadata by ISBN
   *
   * @param isbn - ISBN-10 or ISBN-13
   * @returns Book metadata or null if not found
   */
  lookupByISBN(isbn: string): Promise<BookMetadata | null>;

  /**
   * Search for books by title and/or author
   *
   * @param query - Search query (title, author, or both)
   * @param options - Search options
   * @returns Array of book metadata
   */
  searchBooks(
    query: string,
    options?: {
      maxResults?: number;
      language?: string;
      startIndex?: number;
    },
  ): Promise<BookMetadata[]>;

  /**
   * Get provider name for logging
   *
   * @returns Provider name (e.g., "Google Books", "Open Library")
   */
  getProviderName(): string;
}
