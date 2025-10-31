import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { LocationService } from './location.service';
import type { IImageUploadService } from '../interfaces/image-upload.interface';

/**
 * UserService
 *
 * Handles user profile management and statistics.
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Handles user business logic only
 * - Dependency Inversion: Depends on IImageUploadService interface, not concrete Cloudinary
 * - Open/Closed: Easy to extend with new profile features without modifying existing code
 *
 * Design Decisions:
 * - Karma calculation is placeholder - can be extended with complex algorithm
 * - Profile updates are selective (only provided fields are updated)
 * - Statistics methods separated for clarity
 */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly locationService: LocationService,
    @Inject('IImageUploadService')
    private readonly imageUploadService: IImageUploadService,
  ) {}

  /**
   * Get user by ID
   *
   * @param userId - User ID
   * @param includePrivateFields - Whether to include private fields (refresh_token, etc.)
   * @returns User entity
   * @throws NotFoundException if user not found
   */
  async findById(
    userId: string,
    includePrivateFields: boolean = false,
  ): Promise<User> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :userId', { userId });

    if (!includePrivateFields) {
      queryBuilder.select([
        'user.id',
        'user.first_name',
        'user.middle_name',
        'user.last_name',
        'user.phone_number',
        'user.phone_verified',
        'user.email',
        'user.email_verified',
        'user.profile_picture',
        'user.bio',
        'user.location',
        'user.address',
        'user.city',
        'user.region',
        'user.country',
        'user.ghana_card_verified',
        'user.subscription_tier',
        'user.subscription_expires_at',
        'user.total_exchanges',
        'user.rating',
        'user.total_ratings',
        'user.is_active',
        'user.last_login_at',
        'user.created_at',
      ]);
    }

    const user = await queryBuilder.getOne();

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  /**
   * Get user by phone number
   *
   * @param phoneNumber - Phone number
   * @returns User entity or null
   */
  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { phone_number: phoneNumber },
    });
  }

  /**
   * Get public profile (limited information for other users to see)
   *
   * @param userId - User ID
   * @returns Public user profile
   * @throws NotFoundException if user not found or inactive
   */
  async getPublicProfile(userId: string): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { id: userId, is_active: true },
      select: [
        'id',
        'first_name',
        'middle_name',
        'last_name',
        'profile_picture',
        'bio',
        'city',
        'region',
        'ghana_card_verified',
        'subscription_tier',
        'total_exchanges',
        'rating',
        'total_ratings',
        'created_at',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found or inactive');
    }

    return user;
  }

  /**
   * Update user profile
   *
   * @param userId - User ID
   * @param updateData - Partial user data to update
   * @returns Updated user
   */
  async updateProfile(
    userId: string,
    updateData: Partial<{
      first_name: string;
      middle_name: string;
      last_name: string;
      email: string;
      bio: string;
      address: string;
      city: string;
      region: string;
    }>,
  ): Promise<User> {
    // Verify user exists
    await this.findById(userId);

    // Validate email format if provided
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        throw new BadRequestException('Invalid email format');
      }

      // Check if email is already taken by another user
      const existingUser = await this.userRepository.findOne({
        where: { email: updateData.email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('Email already in use');
      }
    }

    // Validate bio length
    if (updateData.bio && updateData.bio.length > 500) {
      throw new BadRequestException('Bio cannot exceed 500 characters');
    }

    // Perform update
    await this.userRepository.update(userId, updateData);

    return this.findById(userId);
  }

  /**
   * Update user location
   *
   * @param userId - User ID
   * @param latitude - Latitude
   * @param longitude - Longitude
   * @param address - Optional address
   * @param city - Optional city
   * @param region - Optional region
   * @returns Updated user
   */
  async updateLocation(
    userId: string,
    latitude: number,
    longitude: number,
    address?: string,
    city?: string,
    region?: string,
  ): Promise<User> {
    // Verify user exists
    await this.findById(userId);

    // Delegate to LocationService (SRP)
    return this.locationService.updateUserLocation(
      userId,
      latitude,
      longitude,
      address,
      city,
      region,
    );
  }

  /**
   * Upload user profile picture
   *
   * @param userId - User ID
   * @param imageBuffer - Image buffer from file upload
   * @returns Updated user with new profile picture URL
   */
  async uploadProfilePicture(
    userId: string,
    imageBuffer: Buffer,
  ): Promise<User> {
    // Verify user exists
    const user = await this.findById(userId);

    // Delete old profile picture if exists
    if (user.profile_picture) {
      const publicId = this.extractPublicIdFromUrl(user.profile_picture);
      if (publicId) {
        await this.imageUploadService.deleteImage(publicId);
      }
    }

    // Upload new profile picture via CloudinaryService
    // Note: CloudinaryService has uploadUserAvatar helper with transformations
    const uploadResult = await (
      this.imageUploadService as any
    ).uploadUserAvatar(imageBuffer, userId);

    // Update user with new profile picture URL
    await this.userRepository.update(userId, {
      profile_picture: uploadResult.secure_url || uploadResult.url,
    });

    return this.findById(userId);
  }

  /**
   * Delete user profile picture
   *
   * @param userId - User ID
   * @returns Updated user
   */
  async deleteProfilePicture(userId: string): Promise<User> {
    const user = await this.findById(userId);

    if (!user.profile_picture) {
      throw new BadRequestException('User has no profile picture');
    }

    // Delete from Cloudinary
    const publicId = this.extractPublicIdFromUrl(user.profile_picture);
    if (publicId) {
      await this.imageUploadService.deleteImage(publicId);
    }

    // Update user
    await this.userRepository.update(userId, {
      profile_picture: undefined,
    });

    return this.findById(userId);
  }

  /**
   * Update user statistics after an exchange
   *
   * @param userId - User ID
   * @param rating - Rating received (1-5)
   */
  async updateExchangeStatistics(userId: string, rating?: number): Promise<void> {
    const user = await this.findById(userId);

    // Increment total exchanges
    const newTotalExchanges = user.total_exchanges + 1;

    // Update rating if provided
    let newRating = user.rating;
    let newTotalRatings = user.total_ratings;

    if (rating !== undefined) {
      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }

      // Calculate new average rating
      const currentSum = user.rating * user.total_ratings;
      newTotalRatings = user.total_ratings + 1;
      newRating = (currentSum + rating) / newTotalRatings;
    }

    // Update user
    await this.userRepository.update(userId, {
      total_exchanges: newTotalExchanges,
      rating: newRating,
      total_ratings: newTotalRatings,
    });
  }

  /**
   * Calculate user karma score
   *
   * Karma is based on:
   * - Total successful exchanges
   * - Average rating
   * - Ghana Card verification
   * - Account age
   *
   * @param userId - User ID
   * @returns Karma score (0-100)
   *
   * Design Note:
   * This is a simple implementation. Can be extended with more complex algorithms:
   * - Penalty for cancelled exchanges
   * - Bonus for quick responses
   * - Weight based on exchange value
   * - Community endorsements
   */
  async calculateKarmaScore(userId: string): Promise<number> {
    const user = await this.findById(userId);

    let karma = 0;

    // Base karma from exchanges (max 40 points)
    // 1 point per exchange, capped at 40
    karma += Math.min(user.total_exchanges, 40);

    // Karma from rating (max 30 points)
    // 5-star rating = 30 points, 4-star = 24 points, etc.
    if (user.total_ratings > 0) {
      karma += (user.rating / 5) * 30;
    }

    // Ghana Card verification bonus (15 points)
    if (user.ghana_card_verified) {
      karma += 15;
    }

    // Account age bonus (max 15 points)
    // 1 point per month, capped at 15
    const accountAgeMonths = Math.floor(
      (Date.now() - user.created_at.getTime()) / (1000 * 60 * 60 * 24 * 30),
    );
    karma += Math.min(accountAgeMonths, 15);

    // Cap at 100
    return Math.min(Math.round(karma), 100);
  }

  /**
   * Deactivate user account
   *
   * @param userId - User ID
   */
  async deactivateAccount(userId: string): Promise<void> {
    await this.userRepository.update(userId, { is_active: false });
  }

  /**
   * Reactivate user account
   *
   * @param userId - User ID
   */
  async reactivateAccount(userId: string): Promise<void> {
    await this.userRepository.update(userId, { is_active: true });
  }

  /**
   * Ban user (admin action)
   *
   * @param userId - User ID
   * @param reason - Ban reason (for logging)
   */
  async banUser(userId: string, reason?: string): Promise<void> {
    await this.userRepository.update(userId, {
      is_banned: true,
      is_active: false,
    });

    // TODO: Log ban reason to audit log
    console.log(`User ${userId} banned. Reason: ${reason || 'Not specified'}`);
  }

  /**
   * Unban user (admin action)
   *
   * @param userId - User ID
   */
  async unbanUser(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      is_banned: false,
      is_active: true,
    });
  }

  /**
   * Update last login timestamp
   *
   * @param userId - User ID
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      last_login_at: new Date(),
    });
  }

  /**
   * Helper: Extract public_id from Cloudinary URL
   *
   * @param url - Cloudinary URL
   * @returns Public ID or null
   */
  private extractPublicIdFromUrl(url: string): string | null {
    // Cloudinary URL format: https://res.cloudinary.com/<cloud_name>/image/upload/<public_id>
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return match ? match[1] : null;
  }
}
