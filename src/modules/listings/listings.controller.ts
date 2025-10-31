import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ListingService } from './services/listing.service';
import { SearchService } from './services/search.service';
import { SubscriptionGuard } from './guards/subscription.guard';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { SearchListingDto } from './dto/search-listing.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('listings')
@Controller()
export class ListingsController {
  constructor(
    private readonly listingService: ListingService,
    private readonly searchService: SearchService,
  ) {}

  /**
   * Create listing (with subscription check)
   */
  @Post()
  @ApiBearerAuth()
  @UseGuards(SubscriptionGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new listing' })
  @ApiResponse({ status: 201, description: 'Listing created successfully' })
  @ApiResponse({ status: 403, description: 'Subscription limit reached' })
  async create(
    @CurrentUser() user: User,
    @Body() createListingDto: CreateListingDto,
  ) {
    return this.listingService.create(user.id, createListingDto);
  }

  /**
   * Search listings (public)
   */
  @Get('search')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search listings' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(@Query() searchDto: SearchListingDto) {
    return this.searchService.search(searchDto);
  }

  /**
   * Get listing by ID (public, increments view count)
   */
  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get listing by ID' })
  @ApiResponse({ status: 200, description: 'Listing retrieved' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async findById(@Param('id') id: string) {
    return this.listingService.findById(id, true);
  }

  /**
   * Get current user's listings
   */
  @Get('user/me')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user listings' })
  @ApiResponse({ status: 200, description: 'User listings retrieved' })
  async getMyListings(@CurrentUser() user: User) {
    return this.listingService.findByUser(user.id);
  }

  /**
   * Update listing
   */
  @Patch(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update listing' })
  @ApiResponse({ status: 200, description: 'Listing updated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateListingDto: UpdateListingDto,
  ) {
    return this.listingService.update(id, user.id, updateListingDto);
  }

  /**
   * Upload listing images
   */
  @Post(':id/images')
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 5))
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload listing images (max 5)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Images uploaded' })
  async uploadImages(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @UploadedFiles() files: any[],
  ) {
    const buffers = files.map((file) => file.buffer);
    return this.listingService.uploadImages(id, user.id, buffers);
  }

  /**
   * Cancel listing
   */
  @Post(':id/cancel')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel listing' })
  @ApiResponse({ status: 200, description: 'Listing cancelled' })
  async cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.listingService.cancel(id, user.id);
  }

  /**
   * Reactivate listing
   */
  @Post(':id/reactivate')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate cancelled listing' })
  @ApiResponse({ status: 200, description: 'Listing reactivated' })
  async reactivate(@Param('id') id: string, @CurrentUser() user: User) {
    return this.listingService.reactivate(id, user.id);
  }

  /**
   * Delete listing
   */
  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete listing' })
  @ApiResponse({ status: 200, description: 'Listing deleted' })
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    await this.listingService.delete(id, user.id);
    return { message: 'Listing deleted successfully' };
  }
}
