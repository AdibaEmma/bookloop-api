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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MeetupSpotsService } from './meetup-spots.service';
import { CreateMeetupSpotDto } from './dto/create-meetup-spot.dto';
import { UpdateMeetupSpotDto } from './dto/update-meetup-spot.dto';
import { SearchMeetupSpotsDto } from './dto/search-meetup-spots.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Meetup Spots')
@Controller('meetup-spots')
export class MeetupSpotsController {
  constructor(private readonly meetupSpotsService: MeetupSpotsService) {}

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search meetup spots with location-based filtering' })
  @ApiResponse({ status: 200, description: 'Meetup spots retrieved successfully' })
  async search(@Query() dto: SearchMeetupSpotsDto) {
    return this.meetupSpotsService.search(dto);
  }

  @Get('featured')
  @Public()
  @ApiOperation({ summary: 'Get featured meetup spots' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Featured spots retrieved successfully' })
  async getFeatured(@Query('limit') limit?: number) {
    return this.meetupSpotsService.getFeatured(limit ? parseInt(limit as any) : 10);
  }

  @Get('popular')
  @Public()
  @ApiOperation({ summary: 'Get popular meetup spots by usage count' })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Popular spots retrieved successfully' })
  async getPopular(
    @Query('city') city?: string,
    @Query('limit') limit?: number,
  ) {
    return this.meetupSpotsService.getPopular(city, limit ? parseInt(limit as any) : 10);
  }

  @Get('city/:city')
  @Public()
  @ApiOperation({ summary: 'Get meetup spots by city' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'City spots retrieved successfully' })
  async getByCity(
    @Param('city') city: string,
    @Query('limit') limit?: number,
  ) {
    return this.meetupSpotsService.getByCity(city, limit ? parseInt(limit as any) : 20);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a single meetup spot by ID' })
  @ApiResponse({ status: 200, description: 'Meetup spot retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Meetup spot not found' })
  async findOne(@Param('id') id: string) {
    return this.meetupSpotsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new meetup spot (Admin only)' })
  @ApiResponse({ status: 201, description: 'Meetup spot created successfully' })
  async create(@Body() dto: CreateMeetupSpotDto) {
    return this.meetupSpotsService.create(dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all meetup spots (Admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({ status: 200, description: 'All meetup spots retrieved successfully' })
  async findAll(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.meetupSpotsService.findAll(
      limit ? parseInt(limit as any) : 50,
      offset ? parseInt(offset as any) : 0,
    );
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a meetup spot (Admin only)' })
  @ApiResponse({ status: 200, description: 'Meetup spot updated successfully' })
  @ApiResponse({ status: 404, description: 'Meetup spot not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMeetupSpotDto,
  ) {
    return this.meetupSpotsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a meetup spot (Admin only)' })
  @ApiResponse({ status: 200, description: 'Meetup spot deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Meetup spot not found' })
  async remove(@Param('id') id: string) {
    return this.meetupSpotsService.remove(id);
  }

  @Post(':id/increment-usage')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Increment usage count when a meetup spot is selected' })
  @ApiResponse({ status: 200, description: 'Usage count incremented' })
  async incrementUsage(@Param('id') id: string) {
    await this.meetupSpotsService.incrementUsageCount(id);
    return { message: 'Usage count incremented' };
  }
}
