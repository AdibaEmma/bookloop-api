import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { Listing } from '../entities/listing.entity';
import {
  ISearchStrategy,
  SearchCriteria,
} from '../interfaces/search-strategy.interface';

/**
 * Location-based Search Strategy
 *
 * Uses PostGIS ST_DWithin for efficient spatial queries.
 * Finds listings within a specified radius from a point.
 *
 * Strategy Pattern Implementation:
 * - Encapsulates location-based search logic
 * - Can be swapped or combined with other strategies
 *
 * Performance Note:
 * - ST_DWithin uses spatial indexes (GIST) for fast queries
 * - Ensure index exists: CREATE INDEX listings_location_idx ON listings USING GIST(location);
 */
@Injectable()
export class LocationSearchStrategy implements ISearchStrategy {
  getStrategyName(): string {
    return 'LocationSearch';
  }

  /**
   * Check if this strategy can handle the criteria
   * Requires latitude, longitude, and radius
   */
  canHandle(criteria: SearchCriteria): boolean {
    return !!(
      criteria.latitude !== undefined &&
      criteria.longitude !== undefined &&
      criteria.radiusMeters !== undefined
    );
  }

  /**
   * Apply location-based search to query builder
   *
   * Uses PostGIS ST_DWithin for efficient spatial queries:
   * ST_DWithin(geography1, geography2, distance_meters) returns true if within distance
   */
  applySearch(
    queryBuilder: SelectQueryBuilder<Listing>,
    criteria: SearchCriteria,
  ): SelectQueryBuilder<Listing> {
    const { latitude, longitude, radiusMeters } = criteria;

    // Build PostGIS point from coordinates
    const point = `SRID=4326;POINT(${longitude} ${latitude})`;

    // Apply ST_DWithin spatial query
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

    // Add distance calculation for sorting and display
    queryBuilder = queryBuilder.addSelect(
      `ST_Distance(
        listing.location,
        ST_GeographyFromText(:point)
      )`,
      'distance',
    );

    // Sort by distance (nearest first)
    queryBuilder = queryBuilder.orderBy('distance', 'ASC');

    return queryBuilder;
  }
}
