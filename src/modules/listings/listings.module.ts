import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from './entities/listing.entity';
import { ListingsController } from './listings.controller';
import { ListingService } from './services/listing.service';
import { SearchService } from './services/search.service';
import { LocationSearchStrategy } from './strategies/location-search.strategy';
import { TextSearchStrategy } from './strategies/text-search.strategy';
import { HybridSearchStrategy } from './strategies/hybrid-search.strategy';
import { SubscriptionGuard } from './guards/subscription.guard';
import { BooksModule } from '../books/books.module';
import { UsersModule } from '../users/users.module';

/**
 * ListingsModule
 *
 * Provides listing management and search functionality.
 *
 * Services:
 * - ListingService: Listing CRUD and lifecycle management
 * - SearchService: Orchestrates search strategies (Strategy Pattern)
 *
 * Strategies:
 * - LocationSearchStrategy: PostGIS-based location search
 * - TextSearchStrategy: PostgreSQL FTS across book fields
 * - HybridSearchStrategy: Combined location + text search
 *
 * Guards:
 * - SubscriptionGuard: Enforces listing limits per subscription tier
 *
 * Imports:
 * - BooksModule: For BookService (book validation)
 * - UsersModule: For IImageUploadService (image uploads)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Listing]),
    BooksModule,
    UsersModule,
  ],
  controllers: [ListingsController],
  providers: [
    ListingService,
    SearchService,
    LocationSearchStrategy,
    TextSearchStrategy,
    HybridSearchStrategy,
    SubscriptionGuard,
  ],
  exports: [TypeOrmModule, ListingService],
})
export class ListingsModule {}
