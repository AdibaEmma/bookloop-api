import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { Listing } from '../entities/listing.entity';
import {
  ISearchStrategy,
  SearchCriteria,
} from '../interfaces/search-strategy.interface';

/**
 * Text-based Search Strategy
 *
 * Uses PostgreSQL Full-Text Search (FTS) to search across:
 * - Book title
 * - Book author
 * - Listing description
 *
 * Strategy Pattern Implementation:
 * - Encapsulates text search logic
 * - Independent from location search
 * - Can be combined with LocationSearchStrategy for hybrid search
 *
 * Performance Note:
 * - Consider creating GIN index for better performance:
 *   CREATE INDEX listings_fts_idx ON listings USING GIN (
 *     to_tsvector('english', description)
 *   );
 */
@Injectable()
export class TextSearchStrategy implements ISearchStrategy {
  getStrategyName(): string {
    return 'TextSearch';
  }

  /**
   * Check if this strategy can handle the criteria
   * Requires a query string
   */
  canHandle(criteria: SearchCriteria): boolean {
    return !!(criteria.query && criteria.query.trim().length > 0);
  }

  /**
   * Apply text-based search to query builder
   *
   * Searches across:
   * 1. Book title (via join)
   * 2. Book author (via join)
   * 3. Listing description
   *
   * Uses PostgreSQL's to_tsvector and plainto_tsquery for FTS
   */
  applySearch(
    queryBuilder: SelectQueryBuilder<Listing>,
    criteria: SearchCriteria,
  ): SelectQueryBuilder<Listing> {
    const { query } = criteria;

    // Join with Book entity to search book fields
    queryBuilder = queryBuilder
      .leftJoinAndSelect('listing.book', 'book')
      .andWhere(
        `(
          to_tsvector('english', book.title || ' ' || book.author || ' ' || COALESCE(listing.description, ''))
          @@ plainto_tsquery('english', :query)
        )`,
        { query },
      );

    // Add relevance ranking for sorting
    queryBuilder = queryBuilder.addSelect(
      `ts_rank(
        to_tsvector('english', book.title || ' ' || book.author || ' ' || COALESCE(listing.description, '')),
        plainto_tsquery('english', :query)
      )`,
      'relevance',
    );

    // Sort by relevance (most relevant first)
    queryBuilder = queryBuilder.orderBy('relevance', 'DESC');

    return queryBuilder;
  }
}
