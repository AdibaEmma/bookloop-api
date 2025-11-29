import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExchangePreferenceService } from '../services/exchange-preference.service';
import { AddPreferenceDto } from '../dto/add-preference.dto';
import { UpdatePriorityDto } from '../dto/update-priority.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';

@ApiTags('exchange-preferences')
@Controller()
@ApiBearerAuth()
export class ExchangePreferenceController {
  constructor(
    private readonly preferenceService: ExchangePreferenceService,
  ) {}

  /**
   * Add preference to listing
   */
  @Post('listings/:id/preferences')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add exchange preference to listing' })
  @ApiResponse({
    status: 201,
    description: 'Preference added successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (max preferences reached, duplicate, etc.)',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to modify this listing',
  })
  @ApiResponse({ status: 404, description: 'Listing or book not found' })
  async addPreference(
    @Param('id') listingId: string,
    @CurrentUser() user: User,
    @Body() addPreferenceDto: AddPreferenceDto,
  ) {
    return this.preferenceService.addPreference(
      listingId,
      user.id,
      addPreferenceDto.book_id,
      addPreferenceDto.priority || 1,
      user.subscription_tier,
    );
  }

  /**
   * Get all preferences for a listing
   */
  @Get('listings/:id/preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all preferences for a listing' })
  @ApiResponse({
    status: 200,
    description: 'Preferences retrieved successfully',
  })
  async getListingPreferences(@Param('id') listingId: string) {
    return this.preferenceService.getListingPreferences(listingId);
  }

  /**
   * Remove preference
   */
  @Delete('preferences/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove exchange preference' })
  @ApiResponse({
    status: 200,
    description: 'Preference removed successfully',
  })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Preference not found' })
  async removePreference(
    @Param('id') preferenceId: string,
    @CurrentUser() user: User,
  ) {
    await this.preferenceService.removePreference(preferenceId, user.id);
    return { message: 'Preference removed successfully' };
  }

  /**
   * Update preference priority
   */
  @Patch('preferences/:id/priority')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update preference priority' })
  @ApiResponse({
    status: 200,
    description: 'Priority updated successfully',
  })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Preference not found' })
  async updatePriority(
    @Param('id') preferenceId: string,
    @CurrentUser() user: User,
    @Body() updatePriorityDto: UpdatePriorityDto,
  ) {
    return this.preferenceService.updatePriority(
      preferenceId,
      user.id,
      updatePriorityDto.priority,
    );
  }

  /**
   * Clear all preferences for a listing
   */
  @Delete('listings/:id/preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all preferences for a listing' })
  @ApiResponse({
    status: 200,
    description: 'All preferences cleared successfully',
  })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async clearPreferences(
    @Param('id') listingId: string,
    @CurrentUser() user: User,
  ) {
    await this.preferenceService.clearPreferences(listingId, user.id);
    return { message: 'All preferences cleared successfully' };
  }
}
