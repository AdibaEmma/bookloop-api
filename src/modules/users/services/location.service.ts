import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Point } from 'geojson';
import { User } from '../entities/user.entity';

/**
 * LocationService
 *
 * Handles all location-related operations using PostGIS.
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles location operations (updates, distance calculations)
 * - This separation makes the service easier to test and maintain
 *
 * PostGIS Usage:
 * - ST_GeographyFromText: Creates geography point from lat/lng
 * - ST_Distance: Calculates distance in meters between two geography points
 * - ST_DWithin: Finds points within a distance radius
 */
@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Update user's location with PostGIS Point
   *
   * @param userId - User ID
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @param address - Optional human-readable address
   * @param city - Optional city name
   * @param region - Optional region name
   * @returns Updated user
   */
  async updateUserLocation(
    userId: string,
    latitude: number,
    longitude: number,
    address?: string,
    city?: string,
    region?: string,
  ): Promise<User> {
    // Validate coordinates
    this.validateCoordinates(latitude, longitude);

    // Create GeoJSON Point
    const location: Point = {
      type: 'Point',
      coordinates: [longitude, latitude], // GeoJSON uses [lng, lat] order
    };

    // Update user with location data
    await this.userRepository.update(userId, {
      location,
      ...(address && { address }),
      ...(city && { city }),
      ...(region && { region }),
    });

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }

  /**
   * Calculate distance between two users in meters
   * Uses PostGIS ST_Distance for accurate geography calculations
   *
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @returns Distance in meters, or null if either user has no location
   */
  async calculateDistanceBetweenUsers(
    userId1: string,
    userId2: string,
  ): Promise<number | null> {
    const result = await this.userRepository
      .createQueryBuilder('user1')
      .select(
        'ST_Distance(user1.location, user2.location)',
        'distance',
      )
      .innerJoin(User, 'user2', 'user2.id = :userId2', { userId2 })
      .where('user1.id = :userId1', { userId1 })
      .andWhere('user1.location IS NOT NULL')
      .andWhere('user2.location IS NOT NULL')
      .getRawOne();

    return result?.distance ? parseFloat(result.distance) : null;
  }

  /**
   * Find users within a specified radius from a point
   * Uses PostGIS ST_DWithin for efficient spatial queries
   *
   * @param latitude - Center latitude
   * @param longitude - Center longitude
   * @param radiusMeters - Search radius in meters
   * @param excludeUserId - Optional user ID to exclude from results
   * @param limit - Maximum number of results (default: 50)
   * @returns Array of users with their distances
   */
  async findNearbyUsers(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    excludeUserId?: string,
    limit: number = 50,
  ): Promise<Array<User & { distance: number }>> {
    this.validateCoordinates(latitude, longitude);

    // Build PostGIS point from coordinates
    const point = `SRID=4326;POINT(${longitude} ${latitude})`;

    let query = this.userRepository
      .createQueryBuilder('user')
      .select('user.*')
      .addSelect(
        `ST_Distance(user.location, ST_GeographyFromText('${point}'))`,
        'distance',
      )
      .where('user.location IS NOT NULL')
      .andWhere('user.is_active = :isActive', { isActive: true })
      .andWhere(
        `ST_DWithin(user.location, ST_GeographyFromText('${point}'), :radius)`,
        { radius: radiusMeters },
      )
      .orderBy('distance', 'ASC')
      .limit(limit);

    if (excludeUserId) {
      query = query.andWhere('user.id != :excludeUserId', { excludeUserId });
    }

    const users = await query.getRawMany();

    // Transform raw results to include distance
    return users.map((row) => ({
      ...row,
      distance: parseFloat(row.distance),
    }));
  }

  /**
   * Get user's current location coordinates
   *
   * @param userId - User ID
   * @returns Object with latitude and longitude, or null if no location set
   */
  async getUserCoordinates(
    userId: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['location'],
    });

    if (!user?.location) {
      return null;
    }

    const [longitude, latitude] = user.location.coordinates;
    return { latitude, longitude };
  }

  /**
   * Validate latitude and longitude values
   *
   * @param latitude - Latitude to validate
   * @param longitude - Longitude to validate
   * @throws Error if coordinates are invalid
   */
  private validateCoordinates(latitude: number, longitude: number): void {
    if (latitude < -90 || latitude > 90) {
      throw new Error(
        `Invalid latitude: ${latitude}. Must be between -90 and 90`,
      );
    }

    if (longitude < -180 || longitude > 180) {
      throw new Error(
        `Invalid longitude: ${longitude}. Must be between -180 and 180`,
      );
    }

    // Validate for Ghana bounds (roughly 4.5°N to 11.5°N, -3.5°W to 1.5°E)
    // This is a soft validation - log warning but don't throw
    if (
      latitude < 4.5 ||
      latitude > 11.5 ||
      longitude < -3.5 ||
      longitude > 1.5
    ) {
      console.warn(
        `Coordinates (${latitude}, ${longitude}) are outside Ghana bounds. ` +
          'This may be intentional for users traveling abroad.',
      );
    }
  }

  /**
   * Check if user has location set
   *
   * @param userId - User ID
   * @returns True if user has location, false otherwise
   */
  async hasLocation(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['location'],
    });

    return !!user?.location;
  }
}
