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
  ) {}

  /**
   * Create exchange request
   *
   * @param requesterId - User requesting the exchange
   * @param requestData - Exchange request data
   * @returns Created exchange
   */
  async createExchange(
    requesterId: string,
    requestData: {
      listing_id: string;
      offered_listing_id?: string;
      message?: string;
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

    // Create exchange
    const exchange = this.exchangeRepository.create({
      requester_id: requesterId,
      owner_id: listing.user_id,
      listing_id: requestData.listing_id,
      offered_listing_id: requestData.offered_listing_id,
      requester_message: requestData.message,
      status: 'pending',
      requester_confirmed_meetup: false,
      owner_confirmed_meetup: false,
      requester_confirmed_completion: false,
      owner_confirmed_completion: false,
    });

    // Increment interest count on listing
    await this.listingService.incrementInterest(requestData.listing_id);

    return this.exchangeRepository.save(exchange);
  }

  /**
   * Find exchange by ID
   *
   * @param exchangeId - Exchange ID
   * @returns Exchange entity
   * @throws NotFoundException if not found
   */
  async findById(exchangeId: string): Promise<Exchange> {
    const exchange = await this.exchangeRepository.findOne({
      where: { id: exchangeId },
      relations: ['requester', 'owner', 'listing', 'offered_listing'],
    });

    if (!exchange) {
      throw new NotFoundException('Exchange not found');
    }

    return exchange;
  }

  /**
   * Get exchanges for a user
   *
   * @param userId - User ID
   * @param role - Filter by role (requester, owner, or both)
   * @param status - Filter by status
   * @returns Array of exchanges
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
      .leftJoinAndSelect('exchange.offered_listing', 'offered_listing')
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

    return query.getMany();
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

    return this.findById(exchangeId);
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

    return this.exchangeRepository.save(exchange);
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

    return this.findById(exchangeId);
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
    exchange.meetup_address = meetupData.address;
    exchange.meetup_time = meetupData.meetup_time;

    return this.exchangeRepository.save(exchange);
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

    return this.exchangeRepository.save(exchange);
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
    }

    return this.exchangeRepository.save(exchange);
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
