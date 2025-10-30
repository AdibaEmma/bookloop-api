import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UserService } from './services/user.service';
import { LocationService } from './services/location.service';
import { CloudinaryService } from './services/cloudinary.service';

/**
 * UsersModule
 *
 * Provides user profile management functionality.
 *
 * Providers:
 * - UserService: User business logic
 * - LocationService: PostGIS location operations (SRP)
 * - CloudinaryService: Image uploads (DIP via IImageUploadService)
 *
 * Exports:
 * - UserService: For use in other modules (e.g., ExchangesModule)
 * - LocationService: For use in ListingsModule
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [
    UserService,
    LocationService,
    CloudinaryService,
    // Provider binding for IImageUploadService interface
    {
      provide: 'IImageUploadService',
      useClass: CloudinaryService,
    },
  ],
  exports: [
    TypeOrmModule,
    UserService,
    LocationService,
    'IImageUploadService',
  ],
})
export class UsersModule {}
