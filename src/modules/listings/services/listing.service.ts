import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Point } from 'geojson';
import { Listing } from '../entities/listing.entity';
import { BookService } from '../../books/services/book.service';
import type { IImageUploadService } from '../../users/interfaces/image-upload.interface';
import { ConfigService } from '@nestjs/config';

/**
 * ListingService
 *
 * Handles listing management, status updates, and lifecycle.
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles listing business logic
 * - Dependency Inversion: Depends on IImageUploadService interface
 * - Open/Closed: Easy to extend with new listing types
 *
 * Listing Lifecycle:
 * 1. created → available
 * 2. available → reserved (when exchange requested)
 * 3. reserved → exchanged (when exchange completed)
 * 4. available → expired (when expires_at reached)
 * 5. * → cancelled (user cancellation)
 *
 * Design Decisions:
 * - Listings have expiry dates (90 days default)
 * - Multiple images supported (stored as simple-array)
 * - Location copied from user's profile by default
 * - View count incremented on each view
 */
@Injectable()
export class ListingService {
  private readonly DEFAULT_EXPIRY_DAYS = 90;

  constructor(
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    private readonly bookService: BookService,
    @Inject('IImageUploadService')
    private readonly imageUploadService: IImageUploadService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new listing
   *
   * @param userId - User ID creating the listing
   * @param listingData - Listing data
   * @returns Created listing
   */
  async create(
    userId: string,
    listingData: {
      book_id: string;
      listing_type: 'exchange' | 'donate' | 'borrow';
      book_condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
      description?: string;
      latitude: number;
      longitude: number;
      address: string;
      city: string;
      region: string;
      search_radius_km?: number;
      preferred_genres?: string[];
    },
  ): Promise<Listing> {
    // Verify book exists
    await this.bookService.findById(listingData.book_id);

    // Create GeoJSON Point
    const location: Point = {
      type: 'Point',
      coordinates: [listingData.longitude, listingData.latitude],
    };

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.DEFAULT_EXPIRY_DAYS);

    // Create listing
    const listing = this.listingRepository.create({
      user_id: userId,
      book_id: listingData.book_id,
      listing_type: listingData.listing_type,
      book_condition: listingData.book_condition,
      description: listingData.description,
      location,
      address: listingData.address,
      city: listingData.city,
      region: listingData.region,
      search_radius_km: listingData.search_radius_km || 10,
      preferred_genres: listingData.preferred_genres || [],
      status: 'available',
      expires_at: expiresAt,
      views_count: 0,
      interest_count: 0,
    });

    return this.listingRepository.save(listing);
  }

  /**
   * Find listing by ID
   *
   * @param listingId - Listing ID
   * @param incrementView - Whether to increment view count
   * @returns Listing entity
   * @throws NotFoundException if listing not found
   */
  async findById(
    listingId: string,
    incrementView: boolean = false,
  ): Promise<Listing> {
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
      relations: ['user', 'book'],
    });

    if (!listing) {
      throw new NotFoundException(`Listing with ID ${listingId} not found`);
    }

    // Increment view count if requested
    if (incrementView) {
      await this.listingRepository.update(listingId, {
        views_count: listing.views_count + 1,
      });
      listing.views_count += 1;
    }

    return listing;
  }

  /**
   * Get all listings for a user
   *
   * @param userId - User ID
   * @param status - Optional status filter
   * @returns Array of listings
   */
  async findByUser(
    userId: string,
    status?: 'available' | 'reserved' | 'exchanged' | 'expired' | 'cancelled',
  ): Promise<Listing[]> {
    const where: any = { user_id: userId };

    if (status) {
      where.status = status;
    }

    return this.listingRepository.find({
      where,
      relations: ['book'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Update listing
   *
   * @param listingId - Listing ID
   * @param userId - User ID (for authorization)
   * @param updateData - Partial listing data
   * @returns Updated listing
   */
  async update(
    listingId: string,
    userId: string,
    updateData: Partial<{
      listing_type: 'exchange' | 'donate' | 'borrow';
      book_condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
      description: string;
      latitude: number;
      longitude: number;
      address: string;
      city: string;
      region: string;
      search_radius_km: number;
      preferred_genres: string[];
    }>,
  ): Promise<Listing> {
    // Verify listing exists and user owns it
    const listing = await this.findById(listingId);

    if (listing.user_id !== userId) {
      throw new ForbiddenException('You do not own this listing');
    }

    // Cannot update exchanged or cancelled listings
    if (listing.status === 'exchanged' || listing.status === 'cancelled') {
      throw new BadRequestException(
        `Cannot update ${listing.status} listing`,
      );
    }

    // Update location if coordinates provided
    if (updateData.latitude !== undefined && updateData.longitude !== undefined) {
      const location: Point = {
        type: 'Point',
        coordinates: [updateData.longitude, updateData.latitude],
      };
      await this.listingRepository.update(listingId, { location });
      delete updateData.latitude;
      delete updateData.longitude;
    }

    // Update other fields
    await this.listingRepository.update(listingId, updateData);

    return this.findById(listingId);
  }

  /**
   * Upload listing images
   *
   * @param listingId - Listing ID
   * @param userId - User ID (for authorization)
   * @param imageBuffers - Array of image buffers
   * @returns Updated listing
   */
  async uploadImages(
    listingId: string,
    userId: string,
    imageBuffers: Buffer[],
  ): Promise<Listing> {
    // Verify listing exists and user owns it
    const listing = await this.findById(listingId);

    if (listing.user_id !== userId) {
      throw new ForbiddenException('You do not own this listing');
    }

    // Limit to 5 images
    if (imageBuffers.length > 5) {
      throw new BadRequestException('Maximum 5 images allowed per listing');
    }

    // Upload images
    const uploadPromises = imageBuffers.map((buffer, index) =>
      (this.imageUploadService as any).uploadListingPhoto(
        buffer,
        listingId,
        index,
      ),
    );

    const uploadResults = await Promise.all(uploadPromises);

    // Extract URLs
    const imageUrls = uploadResults.map(
      (result) => result.secure_url || result.url,
    );

    // Update listing
    await this.listingRepository.update(listingId, {
      images: imageUrls,
    });

    return this.findById(listingId);
  }

  /**
   * Delete listing image
   *
   * @param listingId - Listing ID
   * @param userId - User ID (for authorization)
   * @param imageUrl - Image URL to delete
   * @returns Updated listing
   */
  async deleteImage(
    listingId: string,
    userId: string,
    imageUrl: string,
  ): Promise<Listing> {
    const listing = await this.findById(listingId);

    if (listing.user_id !== userId) {
      throw new ForbiddenException('You do not own this listing');
    }

    if (!listing.images || !listing.images.includes(imageUrl)) {
      throw new NotFoundException('Image not found in listing');
    }

    // Delete from Cloudinary
    const publicId = this.extractPublicIdFromUrl(imageUrl);
    if (publicId) {
      await this.imageUploadService.deleteImage(publicId);
    }

    // Remove from array
    const updatedImages = listing.images.filter((url) => url !== imageUrl);

    await this.listingRepository.update(listingId, {
      images: updatedImages,
    });

    return this.findById(listingId);
  }

  /**
   * Mark listing as reserved
   *
   * @param listingId - Listing ID
   * @returns Updated listing
   */
  async markAsReserved(listingId: string): Promise<Listing> {
    const listing = await this.findById(listingId);

    if (listing.status !== 'available') {
      throw new BadRequestException('Listing is not available');
    }

    await this.listingRepository.update(listingId, {
      status: 'reserved',
    });

    return this.findById(listingId);
  }

  /**
   * Mark listing as exchanged
   *
   * @param listingId - Listing ID
   * @returns Updated listing
   */
  async markAsExchanged(listingId: string): Promise<Listing> {
    const listing = await this.findById(listingId);

    if (listing.status !== 'reserved') {
      throw new BadRequestException('Listing must be reserved first');
    }

    await this.listingRepository.update(listingId, {
      status: 'exchanged',
    });

    return this.findById(listingId);
  }

  /**
   * Cancel listing
   *
   * @param listingId - Listing ID
   * @param userId - User ID (for authorization)
   * @returns Updated listing
   */
  async cancel(listingId: string, userId: string): Promise<Listing> {
    const listing = await this.findById(listingId);

    if (listing.user_id !== userId) {
      throw new ForbiddenException('You do not own this listing');
    }

    if (listing.status === 'exchanged') {
      throw new BadRequestException('Cannot cancel exchanged listing');
    }

    await this.listingRepository.update(listingId, {
      status: 'cancelled',
    });

    return this.findById(listingId);
  }

  /**
   * Reactivate cancelled listing
   *
   * @param listingId - Listing ID
   * @param userId - User ID (for authorization)
   * @returns Updated listing
   */
  async reactivate(listingId: string, userId: string): Promise<Listing> {
    const listing = await this.findById(listingId);

    if (listing.user_id !== userId) {
      throw new ForbiddenException('You do not own this listing');
    }

    if (listing.status !== 'cancelled') {
      throw new BadRequestException('Only cancelled listings can be reactivated');
    }

    // Check if expired
    if (listing.expires_at && listing.expires_at < new Date()) {
      // Extend expiry
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + this.DEFAULT_EXPIRY_DAYS);

      await this.listingRepository.update(listingId, {
        status: 'available',
        expires_at: newExpiresAt,
      });
    } else {
      await this.listingRepository.update(listingId, {
        status: 'available',
      });
    }

    return this.findById(listingId);
  }

  /**
   * Delete listing
   *
   * @param listingId - Listing ID
   * @param userId - User ID (for authorization)
   */
  async delete(listingId: string, userId: string): Promise<void> {
    const listing = await this.findById(listingId);

    if (listing.user_id !== userId) {
      throw new ForbiddenException('You do not own this listing');
    }

    // Delete images from Cloudinary
    if (listing.images && listing.images.length > 0) {
      const deletePromises = listing.images.map((url) => {
        const publicId = this.extractPublicIdFromUrl(url);
        return publicId ? this.imageUploadService.deleteImage(publicId) : null;
      });
      await Promise.all(deletePromises.filter(Boolean));
    }

    // Delete listing
    await this.listingRepository.delete(listingId);
  }

  /**
   * Increment interest count
   *
   * @param listingId - Listing ID
   */
  async incrementInterest(listingId: string): Promise<void> {
    await this.listingRepository.increment(
      { id: listingId },
      'interest_count',
      1,
    );
  }

  /**
   * Expire old listings (background job)
   * Should be called by scheduled task
   *
   * @returns Number of expired listings
   */
  async expireOldListings(): Promise<number> {
    const result = await this.listingRepository
      .createQueryBuilder()
      .update(Listing)
      .set({ status: 'expired' })
      .where('status = :status', { status: 'available' })
      .andWhere('expires_at < NOW()')
      .execute();

    return result.affected || 0;
  }

  /**
   * Extract public_id from Cloudinary URL
   *
   * @param url - Cloudinary URL
   * @returns Public ID or null
   */
  private extractPublicIdFromUrl(url: string): string | null {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return match ? match[1] : null;
  }
}
