import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExchangeService } from './services/exchange.service';
import { RatingService } from './services/rating.service';
import { CreateExchangeDto } from './dto/create-exchange.dto';
import { SetMeetupDto } from './dto/set-meetup.dto';
import { CreateRatingDto } from './dto/create-rating.dto';
import { RespondExchangeDto } from './dto/respond-exchange.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('exchanges')
@ApiBearerAuth()
@Controller()
export class ExchangesController {
  constructor(
    private readonly exchangeService: ExchangeService,
    private readonly ratingService: RatingService,
  ) {}

  /**
   * Create exchange request
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request an exchange' })
  @ApiResponse({ status: 201, description: 'Exchange created' })
  async create(
    @CurrentUser() user: User,
    @Body() createExchangeDto: CreateExchangeDto,
  ) {
    return this.exchangeService.createExchange(user.id, createExchangeDto);
  }

  /**
   * Get user's exchanges
   */
  @Get('user/me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user exchanges' })
  @ApiResponse({ status: 200, description: 'User exchanges retrieved' })
  async getMyExchanges(
    @CurrentUser() user: User,
    @Query('role') role?: 'requester' | 'owner',
    @Query('status') status?: string,
  ) {
    return this.exchangeService.findByUser(user.id, role, status);
  }

  /**
   * Get incoming exchange requests (as owner)
   */
  @Get('incoming')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get incoming exchange requests' })
  @ApiResponse({ status: 200, description: 'Incoming exchanges retrieved' })
  async getIncomingRequests(
    @CurrentUser() user: User,
    @Query('status') status?: string,
  ) {
    return this.exchangeService.findByUser(user.id, 'owner', status);
  }

  /**
   * Get outgoing exchange requests (as requester)
   */
  @Get('my-requests')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get my exchange requests' })
  @ApiResponse({ status: 200, description: 'My requests retrieved' })
  async getMyRequests(
    @CurrentUser() user: User,
    @Query('status') status?: string,
  ) {
    return this.exchangeService.findByUser(user.id, 'requester', status);
  }

  /**
   * Get exchange by ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get exchange by ID' })
  @ApiResponse({ status: 200, description: 'Exchange retrieved' })
  @ApiResponse({ status: 404, description: 'Exchange not found' })
  async findById(@Param('id') id: string) {
    return this.exchangeService.findById(id);
  }

  /**
   * Accept exchange (owner only)
   */
  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept exchange request' })
  @ApiResponse({ status: 200, description: 'Exchange accepted' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async accept(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() respondDto: RespondExchangeDto,
  ) {
    return this.exchangeService.acceptExchange(id, user.id, respondDto.response);
  }

  /**
   * Decline exchange (owner only)
   */
  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline exchange request' })
  @ApiResponse({ status: 200, description: 'Exchange declined' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async decline(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() respondDto: RespondExchangeDto,
  ) {
    return this.exchangeService.declineExchange(id, user.id, respondDto.response);
  }

  /**
   * Cancel exchange (either party)
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel exchange' })
  @ApiResponse({ status: 200, description: 'Exchange cancelled' })
  async cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.exchangeService.cancelExchange(id, user.id);
  }

  /**
   * Set meetup details
   */
  @Post(':id/meetup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set meetup details' })
  @ApiResponse({ status: 200, description: 'Meetup details set' })
  async setMeetup(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() setMeetupDto: SetMeetupDto,
  ) {
    return this.exchangeService.setMeetupDetails(id, user.id, {
      ...setMeetupDto,
      meetup_time: new Date(setMeetupDto.meetup_time),
    });
  }

  /**
   * Confirm meetup
   */
  @Post(':id/confirm-meetup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm meetup details' })
  @ApiResponse({ status: 200, description: 'Meetup confirmed' })
  async confirmMeetup(@Param('id') id: string, @CurrentUser() user: User) {
    return this.exchangeService.confirmMeetup(id, user.id);
  }

  /**
   * Confirm completion
   */
  @Post(':id/confirm-completion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm exchange completion' })
  @ApiResponse({ status: 200, description: 'Completion confirmed' })
  async confirmCompletion(@Param('id') id: string, @CurrentUser() user: User) {
    return this.exchangeService.confirmCompletion(id, user.id);
  }

  /**
   * Rate exchange
   */
  @Post(':id/rate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Rate the other party after exchange' })
  @ApiResponse({ status: 201, description: 'Rating created' })
  @ApiResponse({ status: 400, description: 'Invalid rating or already rated' })
  async rate(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() createRatingDto: CreateRatingDto,
  ) {
    return this.ratingService.createRating(id, user.id, createRatingDto);
  }

  /**
   * Get ratings for exchange
   */
  @Get(':id/ratings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get ratings for exchange' })
  @ApiResponse({ status: 200, description: 'Ratings retrieved' })
  async getRatings(@Param('id') id: string) {
    return this.ratingService.getRatingsForExchange(id);
  }

  /**
   * Get available actions
   */
  @Get(':id/actions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get available actions for user' })
  @ApiResponse({ status: 200, description: 'Available actions' })
  async getActions(@Param('id') id: string, @CurrentUser() user: User) {
    const actions = await this.exchangeService.getAvailableActions(id, user.id);
    return { actions };
  }
}
