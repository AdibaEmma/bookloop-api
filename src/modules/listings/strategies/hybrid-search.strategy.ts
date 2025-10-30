import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { Listing } from '../entities/listing.entity';
import {
  ISearchStrategy,
  SearchCriteria,
} from '../interfaces/search-strategy.interface';

/**
 * Hybrid Search Strategy
 *
 * Combines location-based and text-based search.
 * Useful for: "Find books about 'programming' within 5km of me"
 *
 * Strategy Pattern Implementation:
 * - Composite strategy combining LocationSearch + TextSearch
 * - Demonstrates Strategy Pattern extensibility
 *
 * Ranking:
 * - Combines distance and text relevance into a composite score
 * - Closer listings with higher relevance rank higher
 *
 * Design Decision:
 * - Could alternatively compose LocationSearchStrategy + TextSearchStrategy
 * - This implementation is more optimized with a single query
 *
 * Tradeoff:
 * - More complex than separate strategies
 * - Better performance (single query vs. multiple)
 */
@Injectable()
export class HybridSearchStrategy implements ISearchStrategy {
  getStrategyName(): string {
    return 'HybridSearch';
  }

  /**
   * Check if this strategy can handle the criteria
   * Requires both location data AND text query
   */
  canHandle(criteria: SearchCriteria): boolean {
    const hasLocation = !!(
      criteria.latitude !== undefined &&
      criteria.longitude !== undefined &&
      criteria.radiusMeters !== undefined
    );
    const hasQuery = !!(criteria.query && criteria.query.trim().length > 0);

    return hasLocation && hasQuery;
  }

  /**
   * Apply hybrid search (location + text)
   *
   * Combines:
   * 1. PostGIS ST_DWithin for location filtering
   * 2. PostgreSQL FTS for text search
   * 3. Composite ranking: (relevance / (distance + 1))
   */
  applySearch(
    queryBuilder: SelectQueryBuilder<Listing>,
    criteria: SearchCriteria,
  ): SelectQueryBuilder<Listing> {
    const { latitude, longitude, radiusMeters, query } = criteria;

    // Build PostGIS point
    const point = `SRID=4326;POINT(${longitude} ${latitude})`;

    // Join with Book entity
    queryBuilder = queryBuilder.leftJoinAndSelect('listing.book', 'book');

    // Apply location filter (ST_DWithin)
    queryBuilder = queryBuilder.andWhere(
      `ST_DWithin(
        listing.location,
        ST_GeographyFromText(:point),
        :radius
      )`,
      {
        point,
        radius: radiusMeters,
      },
    );

    // Apply text search filter
    queryBuilder = queryBuilder.andWhere(
      `(
        to_tsvector('english', book.title || ' ' || book.author || ' ' || COALESCE(listing.description, ''))
        @@ plainto_tsquery('english', :query)
      )`,
      { query },
    );

    // Add distance calculation
    queryBuilder = queryBuilder.addSelect(
      `ST_Distance(
        listing.location,
        ST_GeographyFromText(:point)
      )`,
      'distance',
    );

    // Add text relevance calculation
    queryBuilder = queryBuilder.addSelect(
      `ts_rank(
        to_tsvector('english', book.title || ' ' || book.author || ' ' || COALESCE(listing.description, '')),
        plainto_tsquery('english', :query)
      )`,
      'relevance',
    );

    // Composite ranking: relevance / (distance_in_km + 1)
    // This balances text relevance with proximity
    // +1 prevents division by zero
    queryBuilder = queryBuilder.addSelect(
      `(
        ts_rank(
          to_tsvector('english', book.title || ' ' || book.author || ' ' || COALESCE(listing.description, '')),
          plainto_tsquery('english', :query)
        ) / (
          (ST_Distance(listing.location, ST_GeographyFromText(:point)) / 1000.0) + 1
        )
      )`,
      'composite_score',
    );

    // Sort by composite score (higher is better)
    queryBuilder = queryBuilder.orderBy('composite_score', 'DESC');

    return queryBuilder;
  }
}
