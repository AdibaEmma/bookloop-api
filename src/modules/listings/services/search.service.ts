import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing } from '../entities/listing.entity';
import {
  ISearchStrategy,
  SearchCriteria,
  SearchResult,
} from '../interfaces/search-strategy.interface';
import { LocationSearchStrategy } from '../strategies/location-search.strategy';
import { TextSearchStrategy } from '../strategies/text-search.strategy';
import { HybridSearchStrategy } from '../strategies/hybrid-search.strategy';

/**
 * SearchService
 *
 * Manages listing search using Strategy Pattern.
 *
 * SOLID Principles Applied:
 * - Open/Closed Principle: New strategies can be added without modifying this class
 * - Strategy Pattern: Dynamically selects search algorithm based on criteria
 * - Single Responsibility: Only orchestrates search, delegates to strategies
 *
 * Strategy Selection Priority:
 * 1. HybridSearchStrategy (if both location and text provided)
 * 2. LocationSearchStrategy (if location provided)
 * 3. TextSearchStrategy (if text query provided)
 * 4. Default: List all available listings
 *
 * Design Decision:
 * - Strategies are injected and stored in priority order
 * - First strategy that can handle criteria is used
 * - Easy to add new strategies by injecting them
 *
 * Example Extension:
 * - Add PopularitySearchStrategy (sort by views/interest)
 * - Add RecommendationSearchStrategy (ML-based)
 * - Add TrendingSearchStrategy (time-based popularity)
 */
@Injectable()
export class SearchService {
  private readonly strategies: ISearchStrategy[];

  constructor(
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    private readonly hybridSearchStrategy: HybridSearchStrategy,
    private readonly locationSearchStrategy: LocationSearchStrategy,
    private readonly textSearchStrategy: TextSearchStrategy,
  ) {
    // Priority order: Hybrid > Location > Text
    this.strategies = [
      this.hybridSearchStrategy,
      this.locationSearchStrategy,
      this.textSearchStrategy,
    ];
  }

  /**
   * Search listings using appropriate strategy
   *
   * @param criteria - Search criteria
   * @returns Search results with listings and total count
   */
  async search(criteria: SearchCriteria): Promise<SearchResult> {
    // Validate criteria
    this.validateCriteria(criteria);

    // Set defaults
    const limit = Math.min(criteria.limit || 20, 100);
    const offset = criteria.offset || 0;

    // Build base query
    let queryBuilder = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.user', 'user')
      .leftJoinAndSelect('listing.book', 'book');

    // Select appropriate strategy
    const strategy = this.selectStrategy(criteria);

    if (strategy) {
      console.log(`Using search strategy: ${strategy.getStrategyName()}`);
      queryBuilder = strategy.applySearch(queryBuilder, criteria);
    } else {
      // Default: no specific strategy, just list all
      // Sort by created_at (newest first)
      queryBuilder = queryBuilder.orderBy('listing.created_at', 'DESC');
    }

    // Apply common filters
    queryBuilder = this.applyFilters(queryBuilder, criteria);

    // Apply pagination
    queryBuilder = queryBuilder.skip(offset).take(limit);

    // Execute query
    const [listings, total] = await queryBuilder.getManyAndCount();

    return {
      listings,
      total,
    };
  }

  /**
   * Select the most appropriate search strategy
   * Uses first strategy that can handle the criteria
   *
   * @param criteria - Search criteria
   * @returns Selected strategy or null for default behavior
   */
  private selectStrategy(criteria: SearchCriteria): ISearchStrategy | null {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(criteria)) {
        return strategy;
      }
    }
    return null;
  }

  /**
   * Apply common filters (listing type, condition, genre, status, etc.)
   *
   * @param queryBuilder - Query builder
   * @param criteria - Search criteria
   * @returns Modified query builder
   */
  private applyFilters(
    queryBuilder: any,
    criteria: SearchCriteria,
  ): any {
    // Filter by listing type
    if (criteria.listingType) {
      queryBuilder = queryBuilder.andWhere(
        'listing.listing_type = :listingType',
        { listingType: criteria.listingType },
      );
    }

    // Filter by book condition
    if (criteria.condition) {
      queryBuilder = queryBuilder.andWhere(
        'listing.book_condition = :condition',
        { condition: criteria.condition },
      );
    }

    // Filter by genre (requires book join)
    if (criteria.genre) {
      // Ensure book is joined
      if (!queryBuilder.expressionMap.aliases.find((a: any) => a.name === 'book')) {
        queryBuilder = queryBuilder.leftJoinAndSelect('listing.book', 'book');
      }
      queryBuilder = queryBuilder.andWhere('book.genre = :genre', {
        genre: criteria.genre,
      });
    }

    // Filter by status (default: only available)
    const status = criteria.status || 'available';
    queryBuilder = queryBuilder.andWhere('listing.status = :status', {
      status,
    });

    // Exclude specific user's listings
    if (criteria.excludeUserId) {
      queryBuilder = queryBuilder.andWhere('listing.user_id != :excludeUserId', {
        excludeUserId: criteria.excludeUserId,
      });
    }

    // Only show non-expired listings
    queryBuilder = queryBuilder.andWhere(
      '(listing.expires_at IS NULL OR listing.expires_at > NOW())',
    );

    return queryBuilder;
  }

  /**
   * Validate search criteria
   *
   * @param criteria - Search criteria
   * @throws BadRequestException if invalid
   */
  private validateCriteria(criteria: SearchCriteria): void {
    // Validate location coordinates if provided
    if (criteria.latitude !== undefined) {
      if (criteria.latitude < -90 || criteria.latitude > 90) {
        throw new BadRequestException(
          'Invalid latitude. Must be between -90 and 90',
        );
      }
    }

    if (criteria.longitude !== undefined) {
      if (criteria.longitude < -180 || criteria.longitude > 180) {
        throw new BadRequestException(
          'Invalid longitude. Must be between -180 and 180',
        );
      }
    }

    // Validate radius if provided
    if (criteria.radiusMeters !== undefined) {
      if (criteria.radiusMeters <= 0 || criteria.radiusMeters > 100000) {
        throw new BadRequestException(
          'Invalid radius. Must be between 0 and 100000 meters (100km)',
        );
      }
    }

    // If location is provided, all location fields must be present
    const hasAnyLocation =
      criteria.latitude !== undefined ||
      criteria.longitude !== undefined ||
      criteria.radiusMeters !== undefined;

    if (hasAnyLocation) {
      if (
        criteria.latitude === undefined ||
        criteria.longitude === undefined ||
        criteria.radiusMeters === undefined
      ) {
        throw new BadRequestException(
          'For location search, latitude, longitude, and radiusMeters are all required',
        );
      }
    }

    // Validate query string if provided
    if (criteria.query !== undefined && criteria.query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    // Validate limit
    if (criteria.limit !== undefined) {
      if (criteria.limit < 1 || criteria.limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }
    }

    // Validate offset
    if (criteria.offset !== undefined && criteria.offset < 0) {
      throw new BadRequestException('Offset cannot be negative');
    }
  }

  /**
   * Get nearby listings for a user
   * Convenience method for location-based search
   *
   * @param userId - User ID
   * @param radiusKm - Search radius in kilometers
   * @param options - Additional search options
   * @returns Search results
   */
  async getNearbyForUser(
    userId: string,
    radiusKm: number = 10,
    options?: {
      listingType?: 'exchange' | 'donate' | 'borrow';
      condition?: string;
      limit?: number;
    },
  ): Promise<SearchResult> {
    // This would require fetching user's location first
    // Implementation depends on having UserService injected
    // For now, throw error indicating this needs user location
    throw new BadRequestException(
      'getNearbyForUser not yet implemented. Use search with coordinates directly.',
    );
  }
}
