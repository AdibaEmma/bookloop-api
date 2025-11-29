import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * OpenLibrary API Service
 *
 * Used as fallback for cover images when Google Books doesn't have one.
 *
 * OpenLibrary Covers API Documentation:
 * https://openlibrary.org/dev/docs/api/covers
 *
 * Cover URLs:
 * - By ISBN: https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg
 * - Sizes: S (small), M (medium), L (large)
 */
@Injectable()
export class OpenLibraryService {
  private readonly logger = new Logger(OpenLibraryService.name);
  private readonly coversBaseUrl = 'https://covers.openlibrary.org/b/isbn';

  /**
   * Get cover image URL by ISBN
   *
   * @param isbn - ISBN-10 or ISBN-13
   * @param size - Cover size: 'S', 'M', or 'L' (default: 'L')
   * @returns Cover URL or null if not available
   */
  async getCoverByISBN(
    isbn: string,
    size: 'S' | 'M' | 'L' = 'L',
  ): Promise<string | null> {
    try {
      // Clean ISBN (remove hyphens and spaces)
      const cleanIsbn = isbn.replace(/[-\s]/g, '');

      // Build cover URL
      const coverUrl = `${this.coversBaseUrl}/${cleanIsbn}-${size}.jpg`;

      // Check if cover exists by making HEAD request
      const response = await axios.head(coverUrl, {
        timeout: 5000,
        validateStatus: (status) => status === 200,
      });

      if (response.status === 200) {
        this.logger.debug(`Found OpenLibrary cover for ISBN: ${isbn}`);
        return coverUrl;
      }

      return null;
    } catch (error) {
      // Cover doesn't exist or request failed
      this.logger.debug(
        `No OpenLibrary cover found for ISBN: ${isbn}`,
      );
      return null;
    }
  }

  /**
   * Get multiple cover sizes
   *
   * @param isbn - ISBN-10 or ISBN-13
   * @returns Object with small, medium, and large cover URLs
   */
  async getAllCovers(isbn: string): Promise<{
    small: string | null;
    medium: string | null;
    large: string | null;
  }> {
    const cleanIsbn = isbn.replace(/[-\s]/g, '');

    return {
      small: await this.getCoverByISBN(cleanIsbn, 'S'),
      medium: await this.getCoverByISBN(cleanIsbn, 'M'),
      large: await this.getCoverByISBN(cleanIsbn, 'L'),
    };
  }
}
