import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import type { Point } from 'geojson';

/**
 * DTO for user responses
 *
 * Purpose:
 * - Exclude sensitive fields (refresh_token, ghana_card_number)
 * - Provide consistent response format
 * - Add computed fields (karma_score)
 *
 * Usage:
 * - Return from controller endpoints
 * - Use class-transformer to serialize
 */
@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'First name', example: 'Kwame' })
  first_name: string;

  @Expose()
  @ApiProperty({ description: 'Middle name', example: 'Nkrumah', required: false })
  middle_name?: string;

  @Expose()
  @ApiProperty({ description: 'Last name', example: 'Mensah' })
  last_name: string;

  @Expose()
  @ApiProperty({ description: 'Full name', example: 'Kwame Nkrumah Mensah' })
  full_name: string;

  @Expose()
  @ApiProperty({ description: 'Phone number', example: '+233241234567' })
  phone_number: string;

  @Expose()
  @ApiProperty({ description: 'Phone verified status', example: true })
  phone_verified: boolean;

  @Expose()
  @ApiProperty({ description: 'Email address', example: 'kwame@example.com', required: false })
  email?: string;

  @Expose()
  @ApiProperty({ description: 'Email verified status', example: false })
  email_verified: boolean;

  @Expose()
  @ApiProperty({
    description: 'Profile picture URL',
    example: 'https://res.cloudinary.com/bookloop/image/upload/v1234567890/users/avatar_123.jpg',
    required: false,
  })
  profile_picture?: string;

  @Expose()
  @ApiProperty({
    description: 'User bio',
    example: 'Avid reader from Accra',
    required: false,
  })
  bio?: string;

  @Expose()
  @ApiProperty({
    description: 'Location coordinates (GeoJSON Point)',
    example: { type: 'Point', coordinates: [-0.1870, 5.6037] },
    required: false,
  })
  location?: Point;

  @Expose()
  @ApiProperty({ description: 'Street address', example: '12 Independence Avenue', required: false })
  address?: string;

  @Expose()
  @ApiProperty({ description: 'City', example: 'Accra', required: false })
  city?: string;

  @Expose()
  @ApiProperty({ description: 'Region', example: 'Greater Accra', required: false })
  region?: string;

  @Expose()
  @ApiProperty({ description: 'Country', example: 'Ghana' })
  country: string;

  @Expose()
  @ApiProperty({ description: 'Ghana Card verified status', example: true })
  ghana_card_verified: boolean;

  @Expose()
  @ApiProperty({ description: 'Ghana Card verification date', required: false })
  ghana_card_verified_at?: Date;

  @Expose()
  @ApiProperty({
    description: 'Subscription tier',
    enum: ['free', 'basic', 'premium'],
    example: 'free',
  })
  subscription_tier: 'free' | 'basic' | 'premium';

  @Expose()
  @ApiProperty({ description: 'Subscription expiry date', required: false })
  subscription_expires_at?: Date;

  @Expose()
  @ApiProperty({ description: 'Total exchanges completed', example: 15 })
  total_exchanges: number;

  @Expose()
  @ApiProperty({ description: 'Average rating (0-5)', example: 4.75 })
  rating: number;

  @Expose()
  @ApiProperty({ description: 'Total ratings received', example: 12 })
  total_ratings: number;

  @Expose()
  @ApiProperty({ description: 'Account active status', example: true })
  is_active: boolean;

  @Expose()
  @ApiProperty({ description: 'Account banned status', example: false })
  is_banned: boolean;

  @Expose()
  @ApiProperty({ description: 'Last login timestamp', required: false })
  last_login_at?: Date;

  @Expose()
  @ApiProperty({ description: 'Account creation timestamp' })
  created_at: Date;

  @Expose()
  @ApiProperty({ description: 'Account last update timestamp' })
  updated_at: Date;
}

/**
 * Public Profile DTO (limited information)
 */
@Exclude()
export class PublicProfileDto {
  @Expose()
  @ApiProperty({ description: 'User ID' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'First name' })
  first_name: string;

  @Expose()
  @ApiProperty({ description: 'Middle name', required: false })
  middle_name?: string;

  @Expose()
  @ApiProperty({ description: 'Last name' })
  last_name: string;

  @Expose()
  @ApiProperty({ description: 'Full name' })
  full_name: string;

  @Expose()
  @ApiProperty({ description: 'Profile picture URL', required: false })
  profile_picture?: string;

  @Expose()
  @ApiProperty({ description: 'User bio', required: false })
  bio?: string;

  @Expose()
  @ApiProperty({ description: 'City', required: false })
  city?: string;

  @Expose()
  @ApiProperty({ description: 'Region', required: false })
  region?: string;

  @Expose()
  @ApiProperty({ description: 'Ghana Card verified status' })
  ghana_card_verified: boolean;

  @Expose()
  @ApiProperty({ description: 'Subscription tier' })
  subscription_tier: string;

  @Expose()
  @ApiProperty({ description: 'Total exchanges completed' })
  total_exchanges: number;

  @Expose()
  @ApiProperty({ description: 'Average rating' })
  rating: number;

  @Expose()
  @ApiProperty({ description: 'Total ratings received' })
  total_ratings: number;

  @Expose()
  @ApiProperty({ description: 'Account creation date' })
  created_at: Date;
}
