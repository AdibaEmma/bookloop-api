import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rating } from '../entities/rating.entity';
import { Exchange } from '../entities/exchange.entity';
import { UserService } from '../../users/services/user.service';

/**
 * RatingService
 *
 * Handles rating and review system for completed exchanges.
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles rating logic
 * - Separation from ExchangeService for clarity
 *
 * Business Rules:
 * 1. Only completed exchanges can be rated
 * 2. Each user can rate the other party once per exchange
 * 3. Ratings are 1-5 stars
 * 4. Ratings are hidden until:
 *    - Both parties have rated, OR
 *    - 7 days have passed since completion
 * 5. User's average rating is updated after each new rating
 *
 * Design Decision:
 * - Separate entity for ratings (not embedded in Exchange)
 * - Allows querying ratings independently
 * - Makes rating history easier to manage
 */
@Injectable()
export class RatingService {
  private readonly VISIBILITY_DELAY_DAYS = 7;

  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: Repository<Rating>,
    @InjectRepository(Exchange)
    private readonly exchangeRepository: Repository<Exchange>,
    private readonly userService: UserService,
  ) {}

  /**
   * Create a rating for an exchange
   *
   * @param exchangeId - Exchange ID
   * @param raterId - User giving the rating
   * @param ratingData - Rating data
   * @returns Created rating
   */
  async createRating(
    exchangeId: string,
    raterId: string,
    ratingData: {
      rating: number;
      review?: string;
    },
  ): Promise<Rating> {
    // Validate rating value
    if (ratingData.rating < 1 || ratingData.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Verify exchange exists and is completed
    const exchange = await this.exchangeRepository.findOne({
      where: { id: exchangeId },
      relations: ['requester', 'owner'],
    });

    if (!exchange) {
      throw new NotFoundException('Exchange not found');
    }

    if (exchange.status !== 'completed') {
      throw new BadRequestException(
        'Can only rate completed exchanges',
      );
    }

    // Verify rater is part of the exchange
    if (raterId !== exchange.requester_id && raterId !== exchange.owner_id) {
      throw new ForbiddenException(
        'You are not a participant in this exchange',
      );
    }

    // Determine who is being rated
    const ratedUserId =
      raterId === exchange.requester_id
        ? exchange.owner_id
        : exchange.requester_id;

    // Check if rating already exists
    const existingRating = await this.ratingRepository.findOne({
      where: {
        exchange_id: exchangeId,
        rater_id: raterId,
        rated_user_id: ratedUserId,
      },
    });

    if (existingRating) {
      throw new BadRequestException(
        'You have already rated this exchange',
      );
    }

    // Check if both parties have now rated
    const otherPartyRating = await this.ratingRepository.findOne({
      where: {
        exchange_id: exchangeId,
        rater_id: ratedUserId,
        rated_user_id: raterId,
      },
    });

    const bothRated = !!otherPartyRating;

    // Create rating
    const rating = this.ratingRepository.create({
      exchange_id: exchangeId,
      rater_id: raterId,
      rated_user_id: ratedUserId,
      rating: ratingData.rating,
      review: ratingData.review,
      is_visible: bothRated, // Visible immediately if both rated
    });

    await this.ratingRepository.save(rating);

    // If both parties have rated, make other rating visible too
    if (bothRated && otherPartyRating) {
      await this.ratingRepository.update(otherPartyRating.id, {
        is_visible: true,
      });
    }

    // Update user's average rating
    await this.userService.updateExchangeStatistics(
      ratedUserId,
      ratingData.rating,
    );

    return rating;
  }

  /**
   * Get ratings for a user (only visible ratings)
   *
   * @param userId - User ID
   * @param limit - Number of ratings to return
   * @returns Array of ratings
   */
  async getRatingsForUser(userId: string, limit: number = 20): Promise<Rating[]> {
    return this.ratingRepository.find({
      where: {
        rated_user_id: userId,
        is_visible: true,
      },
      relations: ['rater', 'exchange'],
      order: { created_at: 'DESC' },
      take: Math.min(limit, 100),
    });
  }

  /**
   * Get rating given by a user for a specific exchange
   *
   * @param exchangeId - Exchange ID
   * @param userId - User ID
   * @returns Rating or null
   */
  async getRatingByUserForExchange(
    exchangeId: string,
    userId: string,
  ): Promise<Rating | null> {
    return this.ratingRepository.findOne({
      where: {
        exchange_id: exchangeId,
        rater_id: userId,
      },
      relations: ['rated_user'],
    });
  }

  /**
   * Get both ratings for an exchange (if visible)
   *
   * @param exchangeId - Exchange ID
   * @returns Array of ratings (0-2 ratings)
   */
  async getRatingsForExchange(exchangeId: string): Promise<Rating[]> {
    return this.ratingRepository.find({
      where: {
        exchange_id: exchangeId,
        is_visible: true,
      },
      relations: ['rater', 'rated_user'],
    });
  }

  /**
   * Check if user has rated an exchange
   *
   * @param exchangeId - Exchange ID
   * @param userId - User ID
   * @returns True if user has rated
   */
  async hasUserRated(exchangeId: string, userId: string): Promise<boolean> {
    const count = await this.ratingRepository.count({
      where: {
        exchange_id: exchangeId,
        rater_id: userId,
      },
    });

    return count > 0;
  }

  /**
   * Make old ratings visible (background job)
   * Should be called by scheduled task
   *
   * Makes ratings visible if 7 days have passed since exchange completion
   * and the other party hasn't rated yet.
   *
   * @returns Number of ratings made visible
   */
  async makeOldRatingsVisible(): Promise<number> {
    // Find completed exchanges older than 7 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.VISIBILITY_DELAY_DAYS);

    const result = await this.ratingRepository
      .createQueryBuilder('rating')
      .innerJoin('rating.exchange', 'exchange')
      .update(Rating)
      .set({ is_visible: true })
      .where('rating.is_visible = :isVisible', { isVisible: false })
      .andWhere('exchange.completed_at < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * Get rating statistics for a user
   *
   * @param userId - User ID
   * @returns Rating stats
   */
  async getRatingStats(userId: string): Promise<{
    total_ratings: number;
    average_rating: number;
    rating_distribution: { [key: number]: number };
  }> {
    const ratings = await this.ratingRepository.find({
      where: {
        rated_user_id: userId,
        is_visible: true,
      },
      select: ['rating'],
    });

    if (ratings.length === 0) {
      return {
        total_ratings: 0,
        average_rating: 0,
        rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    // Calculate distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    ratings.forEach((r) => {
      distribution[r.rating]++;
      sum += r.rating;
    });

    return {
      total_ratings: ratings.length,
      average_rating: sum / ratings.length,
      rating_distribution: distribution,
    };
  }

  /**
   * Delete rating (admin only)
   *
   * @param ratingId - Rating ID
   */
  async deleteRating(ratingId: string): Promise<void> {
    const rating = await this.ratingRepository.findOne({
      where: { id: ratingId },
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    // Note: Consider recalculating user's average rating after deletion
    // For now, ratings are considered immutable after creation

    await this.ratingRepository.delete(ratingId);
  }
}
