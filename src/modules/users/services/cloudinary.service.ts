import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import {
  IImageUploadService,
  UploadResult,
  UploadOptions,
} from '../interfaces/image-upload.interface';

/**
 * Cloudinary Implementation of Image Upload Service
 *
 * SOLID Principles Applied:
 * - Dependency Inversion: Implements IImageUploadService interface
 * - Single Responsibility: Only handles Cloudinary-specific upload logic
 *
 * Configuration Required:
 * - CLOUDINARY_CLOUD_NAME
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 *
 * Usage in other services:
 * ```typescript
 * constructor(
 *   @Inject('IImageUploadService')
 *   private readonly imageUploadService: IImageUploadService
 * ) {}
 * ```
 *
 * This allows easy swapping of providers without changing dependent code.
 */
@Injectable()
export class CloudinaryService implements IImageUploadService {
  constructor(private readonly configService: ConfigService) {
    // Configure Cloudinary on service initialization
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload image from buffer
   *
   * @param buffer - Image buffer (from file upload)
   * @param options - Upload options
   * @returns Upload result with URL and metadata
   */
  async uploadImage(
    buffer: Buffer,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    try {
      // Validate file size if specified
      if (options?.max_file_size && buffer.length > options.max_file_size) {
        throw new BadRequestException(
          `File size ${buffer.length} exceeds maximum ${options.max_file_size} bytes`,
        );
      }

      // Convert buffer to base64 for Cloudinary upload
      const base64Data = `data:image/jpeg;base64,${buffer.toString('base64')}`;

      return await this.uploadImageFromBase64(base64Data, options);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to upload image: ${error.message}`,
      );
    }
  }

  /**
   * Upload image from base64 string
   *
   * @param base64Data - Base64 encoded image (with data URI prefix)
   * @param options - Upload options
   * @returns Upload result with URL and metadata
   */
  async uploadImageFromBase64(
    base64Data: string,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    try {
      // Build Cloudinary upload options
      const uploadOptions: Record<string, any> = {
        folder: options?.folder || 'bookloop',
        resource_type: 'image',
      };

      // Set public_id if provided
      if (options?.public_id) {
        uploadOptions.public_id = options.public_id;
      }

      // Set allowed formats
      if (options?.allowed_formats) {
        uploadOptions.allowed_formats = options.allowed_formats;
      }

      // Apply transformations
      if (options?.transformation) {
        const { width, height, crop, gravity, quality, format } =
          options.transformation;

        uploadOptions.transformation = [];

        if (width || height || crop || gravity) {
          uploadOptions.transformation.push({
            width,
            height,
            crop: crop || 'fill',
            gravity: gravity || 'auto',
          });
        }

        if (quality) {
          uploadOptions.quality = quality;
        }

        if (format) {
          uploadOptions.format = format;
        }
      }

      // Upload to Cloudinary
      const result: UploadApiResponse = await cloudinary.uploader.upload(
        base64Data,
        uploadOptions,
      );

      // Map Cloudinary response to our interface
      return {
        url: result.url,
        secure_url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload image to Cloudinary: ${error.message}`,
      );
    }
  }

  /**
   * Delete an uploaded image from Cloudinary
   *
   * @param publicId - Public ID of the image (e.g., "bookloop/users/avatars/user123")
   * @returns True if deleted successfully, false otherwise
   */
  async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error(`Failed to delete image from Cloudinary: ${error.message}`);
      return false;
    }
  }

  /**
   * Get provider name
   *
   * @returns "Cloudinary"
   */
  getProviderName(): string {
    return 'Cloudinary';
  }

  /**
   * Generate a transformation URL for an existing image
   * Useful for generating thumbnails on-the-fly
   *
   * @param publicId - Public ID of the image
   * @param transformation - Transformation options
   * @returns Transformed image URL
   */
  generateTransformationUrl(
    publicId: string,
    transformation: {
      width?: number;
      height?: number;
      crop?: string;
      gravity?: string;
      quality?: string | number;
      format?: string;
    },
  ): string {
    return cloudinary.url(publicId, {
      transformation: [transformation],
      secure: true,
    });
  }

  /**
   * Helper: Upload user avatar with standard transformations
   *
   * @param buffer - Image buffer
   * @param userId - User ID (used in public_id)
   * @returns Upload result
   */
  async uploadUserAvatar(buffer: Buffer, userId: string): Promise<UploadResult> {
    return this.uploadImage(buffer, {
      folder: 'bookloop/users/avatars',
      public_id: `avatar_${userId}`,
      transformation: {
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        format: 'jpg',
      },
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      max_file_size: 5 * 1024 * 1024, // 5MB
    });
  }

  /**
   * Helper: Upload book cover with standard transformations
   *
   * @param buffer - Image buffer
   * @param bookId - Book ID (used in public_id)
   * @returns Upload result
   */
  async uploadBookCover(buffer: Buffer, bookId: string): Promise<UploadResult> {
    return this.uploadImage(buffer, {
      folder: 'bookloop/books/covers',
      public_id: `cover_${bookId}`,
      transformation: {
        width: 600,
        height: 900,
        crop: 'fill',
        gravity: 'center',
        quality: 'auto',
        format: 'jpg',
      },
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      max_file_size: 3 * 1024 * 1024, // 3MB
    });
  }

  /**
   * Helper: Upload listing photo with standard transformations
   *
   * @param buffer - Image buffer
   * @param listingId - Listing ID (used in public_id)
   * @param photoIndex - Photo index (for multiple photos)
   * @returns Upload result
   */
  async uploadListingPhoto(
    buffer: Buffer,
    listingId: string,
    photoIndex: number = 0,
  ): Promise<UploadResult> {
    return this.uploadImage(buffer, {
      folder: 'bookloop/listings/photos',
      public_id: `listing_${listingId}_${photoIndex}`,
      transformation: {
        width: 800,
        height: 600,
        crop: 'fill',
        gravity: 'center',
        quality: 'auto',
        format: 'jpg',
      },
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      max_file_size: 5 * 1024 * 1024, // 5MB
    });
  }
}
