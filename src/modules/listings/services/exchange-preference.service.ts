import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExchangePreference } from '../entities/exchange-preference.entity';
import { Listing } from '../entities/listing.entity';
import { BookService } from '../../books/services/book.service';

/**
 * ExchangePreferenceService
 *
 * Manages exchange preferences for listings.
 *
 * Business Rules:
 * - Free tier: max 1 preference
 * - Basic tier: max 2 preferences
 * - Premium tier: max 3 preferences
 * - Preferences link to books (not listings)
 * - Priority determines order (1 = highest)
 */
@Injectable()
export class ExchangePreferenceService {
  constructor(
    @InjectRepository(ExchangePreference)
    private readonly preferenceRepository: Repository<ExchangePreference>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    private readonly bookService: BookService,
  ) {}

  /**
   * Get max preferences based on subscription tier
   */
  private getMaxPreferences(subscriptionTier: string): number {
    const limits = {
      free: 1,
      basic: 2,
      premium: 3,
    };
    return limits[subscriptionTier] || 1;
  }

  /**
   * Add preference to listing
   *
   * @param listingId - Listing ID
   * @param userId - User ID (for authorization)
   * @param bookId - Book ID to add as preference
   * @param priority - Priority (1-3, 1 = highest)
   * @param subscriptionTier - User's subscription tier
   * @returns Created preference
   */
  async addPreference(
    listingId: string,
    userId: string,
    bookId: string,
    priority: number = 1,
    subscriptionTier: string,
  ): Promise<ExchangePreference> {
    // Verify listing exists and user owns it
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
      relations: ['user'],
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.user_id !== userId) {
      throw new ForbiddenException('You do not own this listing');
    }

    // Only exchange type listings can have preferences
    if (listing.listing_type !== 'exchange') {
      throw new BadRequestException(
        'Only exchange listings can have preferences',
      );
    }

    // Verify book exists
    await this.bookService.findById(bookId);

    // Check max preferences
    const currentCount = await this.preferenceRepository.count({
      where: { listing_id: listingId },
    });

    const maxPreferences = this.getMaxPreferences(subscriptionTier);

    if (currentCount >= maxPreferences) {
      throw new BadRequestException(
        `Your ${subscriptionTier} plan allows up to ${maxPreferences} preference(s)`,
      );
    }

    // Check for duplicate
    const exists = await this.preferenceRepository.findOne({
      where: { listing_id: listingId, book_id: bookId },
    });

    if (exists) {
      throw new BadRequestException('This book is already in your preferences');
    }

    // Create preference
    const preference = this.preferenceRepository.create({
      listing_id: listingId,
      book_id: bookId,
      priority,
    });

    return this.preferenceRepository.save(preference);
  }

  /**
   * Get all preferences for a listing
   *
   * @param listingId - Listing ID
   * @returns Array of preferences with book details
   */
  async getListingPreferences(
    listingId: string,
  ): Promise<ExchangePreference[]> {
    return this.preferenceRepository.find({
      where: { listing_id: listingId },
      relations: ['book'],
      order: { priority: 'ASC' },
    });
  }

  /**
   * Remove preference
   *
   * @param preferenceId - Preference ID
   * @param userId - User ID (for authorization)
   */
  async removePreference(
    preferenceId: string,
    userId: string,
  ): Promise<void> {
    const preference = await this.preferenceRepository.findOne({
      where: { id: preferenceId },
      relations: ['listing', 'listing.user'],
    });

    if (!preference) {
      throw new NotFoundException('Preference not found');
    }

    if (preference.listing.user_id !== userId) {
      throw new ForbiddenException('You do not own this listing');
    }

    await this.preferenceRepository.delete(preferenceId);
  }

  /**
   * Update preference priority
   *
   * @param preferenceId - Preference ID
   * @param userId - User ID (for authorization)
   * @param priority - New priority
   */
  async updatePriority(
    preferenceId: string,
    userId: string,
    priority: number,
  ): Promise<ExchangePreference> {
    const preference = await this.preferenceRepository.findOne({
      where: { id: preferenceId },
      relations: ['listing', 'listing.user'],
    });

    if (!preference) {
      throw new NotFoundException('Preference not found');
    }

    if (preference.listing.user_id !== userId) {
      throw new ForbiddenException('You do not own this listing');
    }

    preference.priority = priority;
    return this.preferenceRepository.save(preference);
  }

  /**
   * Clear all preferences for a listing
   *
   * @param listingId - Listing ID
   * @param userId - User ID (for authorization)
   */
  async clearPreferences(listingId: string, userId: string): Promise<void> {
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.user_id !== userId) {
      throw new ForbiddenException('You do not own this listing');
    }

    await this.preferenceRepository.delete({ listing_id: listingId });
  }
}
