import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing } from '../entities/listing.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Subscription Guard
 *
 * Enforces listing limits based on subscription tier.
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only checks subscription limits
 * - Open/Closed: Easy to modify limits without changing logic
 *
 * Subscription Limits (from IMPLEMENTATION_PLAN.md):
 * - Free: 3 active listings
 * - Basic: 10 active listings
 * - Premium: Unlimited listings
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, SubscriptionGuard)
 * @Post('/listings')
 * async createListing() { ... }
 *
 * Design Decision:
 * - Guard checks limit before allowing listing creation
 * - Clear error messages guide users to upgrade
 * - Counts only "available" listings (not expired/exchanged)
 *
 * Tradeoff:
 * - Additional database query on each listing creation
 * - Worth it for proper business logic enforcement
 * - Could cache counts with Redis for performance
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  // Listing limits per subscription tier
  private readonly LISTING_LIMITS = {
    free: 3,
    basic: 10,
    premium: Infinity, // Unlimited
  };

  constructor(
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get user's subscription tier
    const subscriptionTier = user.subscription_tier || 'free';

    // Check if user has exceeded listing limit
    const canCreateListing = await this.checkListingLimit(
      user.id,
      subscriptionTier,
    );

    if (!canCreateListing) {
      const limit = this.LISTING_LIMITS[subscriptionTier];
      throw new ForbiddenException(
        `You have reached the maximum of ${limit} active listings for your ${subscriptionTier} subscription. ` +
          `Please upgrade to ${subscriptionTier === 'free' ? 'Basic or Premium' : 'Premium'} for more listings.`,
      );
    }

    return true;
  }

  /**
   * Check if user can create more listings
   *
   * @param userId - User ID
   * @param subscriptionTier - User's subscription tier
   * @returns True if user can create more listings
   */
  private async checkListingLimit(
    userId: string,
    subscriptionTier: 'free' | 'basic' | 'premium',
  ): Promise<boolean> {
    const limit = this.LISTING_LIMITS[subscriptionTier];

    // Premium users have unlimited listings
    if (limit === Infinity) {
      return true;
    }

    // Count user's active listings
    const activeListingsCount = await this.listingRepository.count({
      where: {
        user_id: userId,
        status: 'available', // Only count available listings
      },
    });

    return activeListingsCount < limit;
  }

  /**
   * Get user's remaining listing slots
   * Useful for displaying to users in UI
   *
   * @param userId - User ID
   * @param subscriptionTier - User's subscription tier
   * @returns Number of remaining slots, or -1 for unlimited
   */
  async getRemainingSlots(
    userId: string,
    subscriptionTier: 'free' | 'basic' | 'premium',
  ): Promise<number> {
    const limit = this.LISTING_LIMITS[subscriptionTier];

    // Premium users have unlimited listings
    if (limit === Infinity) {
      return -1; // -1 indicates unlimited
    }

    // Count active listings
    const activeListingsCount = await this.listingRepository.count({
      where: {
        user_id: userId,
        status: 'available',
      },
    });

    return Math.max(0, limit - activeListingsCount);
  }
}
