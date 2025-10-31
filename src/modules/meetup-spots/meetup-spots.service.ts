import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetupSpot } from './entities/meetup-spot.entity';
import { CreateMeetupSpotDto } from './dto/create-meetup-spot.dto';
import { UpdateMeetupSpotDto } from './dto/update-meetup-spot.dto';
import { SearchMeetupSpotsDto } from './dto/search-meetup-spots.dto';
import { LoggerService } from '../../common/logger/logger.service';

@Injectable()
export class MeetupSpotsService {
  constructor(
    @InjectRepository(MeetupSpot)
    private meetupSpotRepository: Repository<MeetupSpot>,
    private logger: LoggerService,
  ) {}

  /**
   * Create a new meetup spot
   */
  async create(dto: CreateMeetupSpotDto) {
    const meetupSpot = this.meetupSpotRepository.create({
      name: dto.name,
      description: dto.description,
      address: dto.address,
      city: dto.city,
      region: dto.region,
      location: `POINT(${dto.longitude} ${dto.latitude})`,
      category: dto.category,
      opening_time: dto.opening_time,
      closing_time: dto.closing_time,
      operating_hours: dto.operating_hours,
    });

    await this.meetupSpotRepository.save(meetupSpot);

    this.logger.log(`Created meetup spot: ${meetupSpot.name} in ${meetupSpot.city}`);

    return meetupSpot;
  }

  /**
   * Search meetup spots with location-based filtering
   */
  async search(dto: SearchMeetupSpotsDto) {
    const limit = dto.limit || 20;
    const offset = dto.offset || 0;
    const radius = dto.radius || 10;

    let query = this.meetupSpotRepository
      .createQueryBuilder('spot')
      .where('spot.is_active = :isActive', { isActive: true });

    // Location-based search
    if (dto.latitude && dto.longitude) {
      query = query
        .addSelect(
          `ST_Distance(
            spot.location::geography,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
          ) / 1000`,
          'distance',
        )
        .setParameter('latitude', dto.latitude)
        .setParameter('longitude', dto.longitude)
        .andWhere(
          `ST_DWithin(
            spot.location::geography,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
            :radius * 1000
          )`,
        )
        .setParameter('radius', radius)
        .orderBy('distance', 'ASC');
    } else {
      // Default ordering by usage count
      query = query.orderBy('spot.usage_count', 'DESC');
    }

    // City filter
    if (dto.city) {
      query = query.andWhere('LOWER(spot.city) = LOWER(:city)', { city: dto.city });
    }

    // Category filter
    if (dto.category) {
      query = query.andWhere('spot.category = :category', { category: dto.category });
    }

    // Pagination
    query = query.take(limit).skip(offset);

    const [spots, total] = await query.getManyAndCount();

    return {
      data: spots,
      total,
      limit,
      offset,
      has_more: offset + limit < total,
    };
  }

  /**
   * Get all meetup spots (admin)
   */
  async findAll(limit = 50, offset = 0) {
    const [spots, total] = await this.meetupSpotRepository.findAndCount({
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      data: spots,
      total,
      limit,
      offset,
      has_more: offset + limit < total,
    };
  }

  /**
   * Get a single meetup spot by ID
   */
  async findOne(id: string) {
    const spot = await this.meetupSpotRepository.findOne({
      where: { id },
    });

    if (!spot) {
      throw new NotFoundException(`Meetup spot with ID ${id} not found`);
    }

    return spot;
  }

  /**
   * Get featured meetup spots
   */
  async getFeatured(limit = 10) {
    const spots = await this.meetupSpotRepository.find({
      where: { is_featured: true, is_active: true },
      order: { usage_count: 'DESC' },
      take: limit,
    });

    return { data: spots };
  }

  /**
   * Get popular meetup spots (by usage count)
   */
  async getPopular(city?: string, limit = 10) {
    const query = this.meetupSpotRepository
      .createQueryBuilder('spot')
      .where('spot.is_active = :isActive', { isActive: true })
      .orderBy('spot.usage_count', 'DESC')
      .take(limit);

    if (city) {
      query.andWhere('LOWER(spot.city) = LOWER(:city)', { city });
    }

    const spots = await query.getMany();

    return { data: spots };
  }

  /**
   * Update a meetup spot
   */
  async update(id: string, dto: UpdateMeetupSpotDto) {
    const spot = await this.findOne(id);

    // Update basic fields
    if (dto.name !== undefined) spot.name = dto.name;
    if (dto.description !== undefined) spot.description = dto.description;
    if (dto.address !== undefined) spot.address = dto.address;
    if (dto.city !== undefined) spot.city = dto.city;
    if (dto.region !== undefined) spot.region = dto.region;
    if (dto.category !== undefined) spot.category = dto.category;
    if (dto.opening_time !== undefined) spot.opening_time = dto.opening_time;
    if (dto.closing_time !== undefined) spot.closing_time = dto.closing_time;
    if (dto.operating_hours !== undefined) spot.operating_hours = dto.operating_hours;
    if (dto.is_active !== undefined) spot.is_active = dto.is_active;
    if (dto.is_featured !== undefined) spot.is_featured = dto.is_featured;

    // Update location if coordinates changed
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      spot.location = `POINT(${dto.longitude} ${dto.latitude})`;
    }

    await this.meetupSpotRepository.save(spot);

    this.logger.log(`Updated meetup spot: ${spot.id}`);

    return spot;
  }

  /**
   * Delete a meetup spot (soft delete by setting is_active to false)
   */
  async remove(id: string) {
    const spot = await this.findOne(id);

    spot.is_active = false;
    await this.meetupSpotRepository.save(spot);

    this.logger.log(`Deactivated meetup spot: ${spot.id}`);

    return { message: 'Meetup spot deactivated successfully' };
  }

  /**
   * Increment usage count when a meetup spot is selected
   */
  async incrementUsageCount(id: string) {
    await this.meetupSpotRepository.increment({ id }, 'usage_count', 1);
  }

  /**
   * Get meetup spots by city
   */
  async getByCity(city: string, limit = 20) {
    const spots = await this.meetupSpotRepository.find({
      where: { city, is_active: true },
      order: { usage_count: 'DESC' },
      take: limit,
    });

    return { data: spots };
  }
}
