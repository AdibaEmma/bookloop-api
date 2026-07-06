import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Point } from 'geojson';
import { Exchange } from '../entities/exchange.entity';
import { ExchangeStateMachine } from '../state-machine/exchange-state-machine.service';
import { ListingService } from '../../listings/services/listing.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';

/**
 * ExchangeService
 *
 * Manages exchange workflow and lifecycle.
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Handles exchange business logic
 * - Delegation: Uses ExchangeStateMachine for state transitions
 * - Uses ListingService for listing status updates
 *
 * Exchange Workflow:
 * 1. Request: Requester requests an exchange
 * 2. Accept/Decline: Owner responds
 * 3. Meetup Coordination: Both parties confirm meetup details
 * 4. Completion: Both parties confirm exchange completion
 * 5. Rating: Both parties can rate each other (via RatingService)
 *
 * Design Decisions:
 * - State machine handles all status transitions
 * - Meetup confirmation requires both parties
 * - Completion requires both confirmations
 * - Listing is marked as reserved when exchange accepted
 * - Listing is marked as exchanged when exchange completed
 */
@Injectable()
export class ExchangeService {
  constructor(
    @InjectRepository(Exchange)
    private readonly exchangeRepository: Repository<Exchange>,
    private readonly exchangeStateMachine: ExchangeStateMachine,
    private readonly listingService: ListingService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Create exchange request
   *
   * @param requesterId - User requesting the exchange
   * @param requestData - Exchange request data with optional proposed meetup
   * @returns Created exchange
   */
  async createExchange(
    requesterId: string,
    requestData: {
      listing_id: string;
      offered_listing_id?: string;
      message?: string;
      proposed_meetup?: {
        meetup_spot_id?: string;
        latitude: number;
        longitude: number;
        address: string;
        location_name?: string;
      };
      proposed_meetup_time?: string;
    },
  ): Promise<Exchange> {
    // Verify listing exists and is available
    const listing = await this.listingService.findById(requestData.listing_id);

    if (listing.status !== 'available') {
      throw new BadRequestException('Listing is not available for exchange');
    }

    // Cannot request your own listing
    if (listing.user_id === requesterId) {
      throw new BadRequestException('Cannot request your own listing');
    }

    // If offering a listing in exchange, verify it
    if (requestData.offered_listing_id) {
      const offeredListing = await this.listingService.findById(
        requestData.offered_listing_id,
      );

      if (offeredListing.user_id !== requesterId) {
        throw new ForbiddenException('You do not own the offered listing');
      }

      if (offeredListing.status !== 'available') {
        throw new BadRequestException('Offered listing is not available');
      }
    }

    // Build meetup location if provided
    let meetupLocation: Point | undefined;
    if (requestData.proposed_meetup) {
      meetupLocation = {
        type: 'Point',
        coordinates: [
          requestData.proposed_meetup.longitude,
          requestData.proposed_meetup.latitude,
        ],
      };
    }

    // Create exchange with proposed meetup details
    const exchange = this.exchangeRepository.create({
      requester_id: requesterId,
      owner_id: listing.user_id,
      listing_id: requestData.listing_id,
      offered_listing_id: requestData.offered_listing_id,
      requester_message: requestData.message,
      status: 'pending',
      // Proposed meetup details
      meetup_spot_id: requestData.proposed_meetup?.meetup_spot_id,
      meetup_spot_name: requestData.proposed_meetup?.location_name,
      meetup_location: meetupLocation,
      meetup_address: requestData.proposed_meetup?.address,
      meetup_time: requestData.proposed_meetup_time
        ? new Date(requestData.proposed_meetup_time)
        : undefined,
      // Confirmation flags
      requester_confirmed_meetup: false,
      owner_confirmed_meetup: false,
      requester_confirmed_completion: false,
      owner_confirmed_completion: false,
    });

    // Increment interest count on listing
    await this.listingService.incrementInterest(requestData.listing_id);

    const savedExchange = await this.exchangeRepository.save(exchange);

    // Build notification message with meetup details
    let notificationMessage = `Someone is interested in exchanging "${listing.book?.title || 'your book'}"`;
    if (requestData.proposed_meetup?.location_name) {
      notificationMessage += ` and proposed meeting at ${requestData.proposed_meetup.location_name}`;
    }

    // Send notification to listing owner
    await this.notificationsService.sendNotification(
      listing.user_id,
      NotificationType.EXCHANGE_REQUEST,
      'New Exchange Request',
      notificationMessage,
      {
        type: 'EXCHANGE_REQUEST',
        exchange_id: savedExchange.id,
        listing_id: listing.id,
        proposed_meetup: requestData.proposed_meetup?.location_name,
        proposed_time: requestData.proposed_meetup_time,
      },
    );

    // Return the exchange with properly formatted geography data
    return this.findById(savedExchange.id);
  }

  /**
   * Find exchange by ID
   *
   * @param exchangeId - Exchange ID
   * @returns Exchange entity with properly formatted meetup_location
   * @throws NotFoundException if not found
   */
  async findById(exchangeId: string, requesterId?: string): Promise<Exchange> {
    // Use query builder to properly transform geography to GeoJSON
    const exchange = await this.exchangeRepository
      .createQueryBuilder('exchange')
      .leftJoinAndSelect('exchange.requester', 'requester')
      .leftJoinAndSelect('exchange.owner', 'owner')
      .leftJoinAndSelect('exchange.listing', 'listing')
      .leftJoinAndSelect('listing.book', 'book')
      .leftJoinAndSelect('listing.user', 'listing_user')
      .leftJoinAndSelect('exchange.offered_listing', 'offered_listing')
      .leftJoinAndSelect('offered_listing.book', 'offered_book')
      .addSelect(
        'ST_AsGeoJSON(exchange.meetup_location)::json',
        'exchange_meetup_location_geojson',
      )
      .where('exchange.id = :id', { id: exchangeId })
      .getRawAndEntities();

    if (!exchange.entities[0]) {
      throw new NotFoundException('Exchange not found');
    }

    const result = exchange.entities[0];

    // Only the two participants may read an exchange — it exposes meetup
    // addresses/times and private messages. (requesterId is omitted by internal
    // callers, which are already scoped server-side.)
    if (
      requesterId &&
      result.owner_id !== requesterId &&
      result.requester_id !== requesterId
    ) {
      throw new ForbiddenException('You are not part of this exchange');
    }

    // Transform meetup_location from raw GeoJSON if available
    if (exchange.raw[0]?.exchange_meetup_location_geojson) {
      result.meetup_location = exchange.raw[0].exchange_meetup_location_geojson;
    }

    return result;
  }

  /**
   * Get exchanges for a user
   *
   * @param userId - User ID
   * @param role - Filter by role (requester, owner, or both)
   * @param status - Filter by status
   * @returns Array of exchanges with properly formatted meetup_location
   */
  async findByUser(
    userId: string,
    role?: 'requester' | 'owner',
    status?: string,
  ): Promise<Exchange[]> {
    const query = this.exchangeRepository
      .createQueryBuilder('exchange')
      .leftJoinAndSelect('exchange.requester', 'requester')
      .leftJoinAndSelect('exchange.owner', 'owner')
      .leftJoinAndSelect('exchange.listing', 'listing')
      .leftJoinAndSelect('listing.book', 'book')
      .leftJoinAndSelect('exchange.offered_listing', 'offered_listing')
      .leftJoinAndSelect('offered_listing.book', 'offered_book')
      .addSelect(
        'ST_AsGeoJSON(exchange.meetup_location)::json',
        'exchange_meetup_location_geojson',
      )
      .where(
        role === 'requester'
          ? 'exchange.requester_id = :userId'
          : role === 'owner'
            ? 'exchange.owner_id = :userId'
            : '(exchange.requester_id = :userId OR exchange.owner_id = :userId)',
        { userId },
      );

    if (status) {
      query.andWhere('exchange.status = :status', { status });
    }

    query.orderBy('exchange.created_at', 'DESC');

    const result = await query.getRawAndEntities();

    // Transform meetup_location for each exchange
    return result.entities.map((exchange, index) => {
      if (result.raw[index]?.exchange_meetup_location_geojson) {
        exchange.meetup_location = result.raw[index].exchange_meetup_location_geojson;
      }
      return exchange;
    });
  }

  /**
   * Accept exchange (owner only)
   *
   * @param exchangeId - Exchange ID
   * @param userId - User ID (must be owner)
   * @param response - Optional response message
   * @returns Updated exchange
   */
  async acceptExchange(
    exchangeId: string,
    userId: string,
    response?: string,
  ): Promise<Exchange> {
    const exchange = await this.findById(exchangeId);

    // Verify user is the owner
    if (exchange.owner_id !== userId) {
      throw new ForbiddenException('Only the listing owner can accept');
    }

    // Use state machine for transition
    this.exchangeStateMachine.accept(exchange);

    // Update response message if provided
    if (response) {
      exchange.owner_response = response;
    }

    await this.exchangeRepository.save(exchange);

    // Mark listing as reserved
    await this.listingService.markAsReserved(exchange.listing_id);

    // If there's an offered listing, mark it as reserved too
    if (exchange.offered_listing_id) {
      await this.listingService.markAsReserved(exchange.offered_listing_id);
    }

    const updatedExchange = await this.findById(exchangeId);

    // Send notification to requester
    await this.notificationsService.sendNotification(
      exchange.requester_id,
      NotificationType.EXCHANGE_ACCEPTED,
      'Exchange Accepted!',
      `Your exchange request has been accepted. Coordinate the meetup to complete the exchange.`,
      {
        type: 'EXCHANGE_ACCEPTED',
        exchange_id: exchange.id,
        listing_id: exchange.listing_id,
      },
    );

    return updatedExchange;
  }

  /**
   * Decline exchange (owner only)
   *
   * @param exchangeId - Exchange ID
   * @param userId - User ID (must be owner)
   * @param response - Optional response message
   * @returns Updated exchange
   */
  async declineExchange(
    exchangeId: string,
    userId: string,
    response?: string,
  ): Promise<Exchange> {
    const exchange = await this.findById(exchangeId);

    // Verify user is the owner
    if (exchange.owner_id !== userId) {
      throw new ForbiddenException('Only the listing owner can decline');
    }

    // Use state machine for transition
    this.exchangeStateMachine.decline(exchange);

    // Update response message if provided
    if (response) {
      exchange.owner_response = response;
    }

    const savedExchange = await this.exchangeRepository.save(exchange);

    // Send notification to requester
    await this.notificationsService.sendNotification(
      exchange.requester_id,
      NotificationType.EXCHANGE_DECLINED,
      'Exchange Declined',
      response || 'Your exchange request was declined.',
      {
        type: 'EXCHANGE_DECLINED',
        exchange_id: exchange.id,
        listing_id: exchange.listing_id,
      },
    );

    // Return with properly formatted geography data
    return this.findById(savedExchange.id);
  }

  /**
   * Cancel exchange (either party)
   *
   * @param exchangeId - Exchange ID
   * @param userId - User ID (requester or owner)
   * @returns Updated exchange
   */
  async cancelExchange(exchangeId: string, userId: string): Promise<Exchange> {
    const exchange = await this.findById(exchangeId);

    // Verify user is part of the exchange
    if (exchange.requester_id !== userId && exchange.owner_id !== userId) {
      throw new ForbiddenException('You are not part of this exchange');
    }

    // Use state machine for transition
    this.exchangeStateMachine.cancel(exchange);

    await this.exchangeRepository.save(exchange);

    // If listing was reserved, make it available again
    if (exchange.status === 'accepted') {
      const listing = await this.listingService.findById(exchange.listing_id);
      if (listing.status === 'reserved') {
        await this.listingService.reactivate(
          exchange.listing_id,
          listing.user_id,
        );
      }

      // Same for offered listing if exists
      if (exchange.offered_listing_id) {
        const offeredListing = await this.listingService.findById(
          exchange.offered_listing_id,
        );
        if (offeredListing.status === 'reserved') {
          await this.listingService.reactivate(
            exchange.offered_listing_id,
            offeredListing.user_id,
          );
        }
      }
    }

    const updatedExchange = await this.findById(exchangeId);

    // Notify the other party
    const otherPartyId =
      userId === exchange.requester_id
        ? exchange.owner_id
        : exchange.requester_id;

    await this.notificationsService.sendNotification(
      otherPartyId,
      NotificationType.EXCHANGE_CANCELLED,
      'Exchange Cancelled',
      'An exchange you were part of has been cancelled.',
      {
        type: 'EXCHANGE_CANCELLED',
        exchange_id: exchange.id,
        listing_id: exchange.listing_id,
      },
    );

    return updatedExchange;
  }

  /**
   * Set meetup details
   *
   * @param exchangeId - Exchange ID
   * @param userId - User ID (requester or owner)
   * @param meetupData - Meetup details
   * @returns Updated exchange
   */
  async setMeetupDetails(
    exchangeId: string,
    userId: string,
    meetupData: {
      meetup_spot_id?: string;
      location_name?: string;
      latitude: number;
      longitude: number;
      address: string;
      meetup_time: Date;
    },
  ): Promise<Exchange> {
    const exchange = await this.findById(exchangeId);

    // Verify user is part of the exchange
    if (exchange.requester_id !== userId && exchange.owner_id !== userId) {
      throw new ForbiddenException('You are not part of this exchange');
    }

    // Must be in accepted state
    if (exchange.status !== 'accepted') {
      throw new BadRequestException(
        'Can only set meetup details for accepted exchanges',
      );
    }

    // Create GeoJSON Point
    const location: Point = {
      type: 'Point',
      coordinates: [meetupData.longitude, meetupData.latitude],
    };

    exchange.meetup_location = location;
    if (meetupData.meetup_spot_id) {
      exchange.meetup_spot_id = meetupData.meetup_spot_id;
    }
    if (meetupData.location_name) {
      exchange.meetup_spot_name = meetupData.location_name;
    }
    exchange.meetup_address = meetupData.address;
    exchange.meetup_time = meetupData.meetup_time;

    // Reset confirmation flags when meetup details change
    exchange.requester_confirmed_meetup = false;
    exchange.owner_confirmed_meetup = false;

    const saved = await this.exchangeRepository.save(exchange);

    // Return with properly formatted geography data
    return this.findById(saved.id);
  }

  /**
   * Confirm meetup (either party)
   *
   * @param exchangeId - Exchange ID
   * @param userId - User ID (requester or owner)
   * @returns Updated exchange
   */
  async confirmMeetup(exchangeId: string, userId: string): Promise<Exchange> {
    const exchange = await this.findById(exchangeId);

    // Verify user is part of the exchange
    if (exchange.requester_id !== userId && exchange.owner_id !== userId) {
      throw new ForbiddenException('You are not part of this exchange');
    }

    // Must be in accepted state
    if (exchange.status !== 'accepted') {
      throw new BadRequestException(
        'Can only confirm meetup for accepted exchanges',
      );
    }

    // Must have meetup details set
    if (!exchange.meetup_location || !exchange.meetup_time) {
      throw new BadRequestException(
        'Meetup details must be set before confirming',
      );
    }

    // Confirm for the appropriate party
    if (userId === exchange.requester_id) {
      exchange.requester_confirmed_meetup = true;
    } else {
      exchange.owner_confirmed_meetup = true;
    }

    const saved = await this.exchangeRepository.save(exchange);

    // Return with properly formatted geography data
    return this.findById(saved.id);
  }

  /**
   * Confirm completion (either party)
   * When both confirm, exchange is marked as completed
   *
   * @param exchangeId - Exchange ID
   * @param userId - User ID (requester or owner)
   * @returns Updated exchange
   */
  async confirmCompletion(exchangeId: string, userId: string): Promise<Exchange> {
    const exchange = await this.findById(exchangeId);

    // Verify user is part of the exchange
    if (exchange.requester_id !== userId && exchange.owner_id !== userId) {
      throw new ForbiddenException('You are not part of this exchange');
    }

    // Must be in accepted state
    if (exchange.status !== 'accepted') {
      throw new BadRequestException(
        'Can only confirm completion for accepted exchanges',
      );
    }

    // Confirm for the appropriate party
    if (userId === exchange.requester_id) {
      exchange.requester_confirmed_completion = true;
    } else {
      exchange.owner_confirmed_completion = true;
    }

    // If both confirmed, complete the exchange
    if (
      exchange.requester_confirmed_completion &&
      exchange.owner_confirmed_completion
    ) {
      this.exchangeStateMachine.complete(exchange);

      // Mark listings as exchanged
      await this.listingService.markAsExchanged(exchange.listing_id);
      if (exchange.offered_listing_id) {
        await this.listingService.markAsExchanged(exchange.offered_listing_id);
      }

      // Notify both parties of successful completion
      await Promise.all([
        this.notificationsService.sendNotification(
          exchange.requester_id,
          NotificationType.EXCHANGE_COMPLETED,
          'Exchange Completed!',
          'Your book exchange has been completed successfully. Consider leaving a rating!',
          {
            type: 'EXCHANGE_COMPLETED',
            exchange_id: exchange.id,
            listing_id: exchange.listing_id,
          },
        ),
        this.notificationsService.sendNotification(
          exchange.owner_id,
          NotificationType.EXCHANGE_COMPLETED,
          'Exchange Completed!',
          'Your book exchange has been completed successfully. Consider leaving a rating!',
          {
            type: 'EXCHANGE_COMPLETED',
            exchange_id: exchange.id,
            listing_id: exchange.listing_id,
          },
        ),
      ]);
    }

    const saved = await this.exchangeRepository.save(exchange);

    // Return with properly formatted geography data
    return this.findById(saved.id);
  }

  /**
   * Get available actions for a user on an exchange
   *
   * @param exchangeId - Exchange ID
   * @param userId - User ID
   * @returns Array of available action names
   */
  async getAvailableActions(
    exchangeId: string,
    userId: string,
  ): Promise<string[]> {
    const exchange = await this.findById(exchangeId);

    // Verify user is part of the exchange
    if (exchange.requester_id !== userId && exchange.owner_id !== userId) {
      return [];
    }

    return this.exchangeStateMachine.getAvailableActions(exchange, userId);
  }
}
