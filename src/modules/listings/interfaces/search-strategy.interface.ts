import { SelectQueryBuilder } from 'typeorm';
import { Listing } from '../entities/listing.entity';

/**
 * Search Strategy Interface
 *
 * SOLID Principles Applied:
 * - Open/Closed Principle: New search strategies can be added without modifying existing code
 * - Strategy Pattern: Encapsulates different search algorithms
 *
 * Benefits:
 * - Easy to add new search types (e.g., CategorySearchStrategy, PopularitySearchStrategy)
 * - Each strategy is independently testable
 * - Clear separation of concerns
 *
 * Tradeoff:
 * - Adds abstraction layer (more files)
 * - Worth it for extensibility - we can easily add:
 *   - Hybrid search (location + text)
 *   - Recommendation-based search
 *   - Trending listings search
 */

export interface SearchCriteria {
  /**
   * Search query string (for text search)
   */
  query?: string;

  /**
   * User's latitude (for location search)
   */
  latitude?: number;

  /**
   * User's longitude (for location search)
   */
  longitude?: number;

  /**
   * Search radius in meters (for location search)
   */
  radiusMeters?: number;

  /**
   * Filter by listing type
   */
  listingType?: 'exchange' | 'donate' | 'borrow';

  /**
   * Filter by book condition
   */
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor';

  /**
   * Filter by genre
   */
  genre?: string;

  /**
   * Filter by status
   */
  status?: 'available' | 'reserved' | 'exchanged' | 'expired' | 'cancelled';

  /**
   * Pagination: limit
   */
  limit?: number;

  /**
   * Pagination: offset
   */
  offset?: number;

  /**
   * Exclude specific user's listings
   */
  excludeUserId?: string;
}

export interface SearchResult {
  /**
   * Array of listings
   */
  listings: Listing[];

  /**
   * Total count (for pagination)
   */
  total: number;

  /**
   * Optional: Distance from search point (for location search)
   */
  distances?: Map<string, number>;
}

/**
 * Search Strategy Interface
 */
export interface ISearchStrategy {
  /**
   * Get strategy name (for logging/debugging)
   */
  getStrategyName(): string;

  /**
   * Apply search logic to query builder
   *
   * @param queryBuilder - TypeORM query builder
   * @param criteria - Search criteria
   * @returns Modified query builder
   */
  applySearch(
    queryBuilder: SelectQueryBuilder<Listing>,
    criteria: SearchCriteria,
  ): SelectQueryBuilder<Listing>;

  /**
   * Check if this strategy can handle the given criteria
   *
   * @param criteria - Search criteria
   * @returns True if this strategy is applicable
   */
  canHandle(criteria: SearchCriteria): boolean;
}
