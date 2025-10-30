/**
 * Image Upload Service Interface
 *
 * SOLID Principles Applied:
 * - Dependency Inversion Principle: Depend on abstraction, not concrete implementation
 * - Interface Segregation Principle: Small, focused interface for image uploads
 *
 * Benefits:
 * - Easy to swap providers (Cloudinary → AWS S3 → Azure Blob)
 * - Simple to mock for testing
 * - Clear contract for what upload services must provide
 *
 * Tradeoff:
 * - Adds abstraction layer, but worth it for flexibility
 * - If we NEVER plan to change providers, direct Cloudinary usage is simpler
 * - For this project, flexibility is valuable given evolving infrastructure needs
 */

export interface UploadResult {
  /**
   * Public URL of the uploaded image
   */
  url: string;

  /**
   * Public ID or key for the uploaded image (for deletion/updates)
   */
  public_id: string;

  /**
   * Optional: Secure HTTPS URL
   */
  secure_url?: string;

  /**
   * Optional: Image dimensions
   */
  width?: number;
  height?: number;

  /**
   * Optional: File format (jpg, png, webp, etc.)
   */
  format?: string;

  /**
   * Optional: File size in bytes
   */
  bytes?: number;
}

export interface UploadOptions {
  /**
   * Folder path in the cloud storage (e.g., "users/avatars")
   */
  folder?: string;

  /**
   * Desired public ID (filename without extension)
   */
  public_id?: string;

  /**
   * Apply transformations (resize, crop, etc.)
   */
  transformation?: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'scale' | 'thumb';
    gravity?: 'face' | 'center' | 'auto';
    quality?: number | 'auto';
    format?: string;
  };

  /**
   * Allowed file formats
   */
  allowed_formats?: string[];

  /**
   * Maximum file size in bytes
   */
  max_file_size?: number;
}

export interface IImageUploadService {
  /**
   * Upload an image from buffer
   *
   * @param buffer - Image buffer
   * @param options - Upload options
   * @returns Upload result with URL and metadata
   */
  uploadImage(buffer: Buffer, options?: UploadOptions): Promise<UploadResult>;

  /**
   * Upload image from base64 string
   *
   * @param base64Data - Base64 encoded image data
   * @param options - Upload options
   * @returns Upload result with URL and metadata
   */
  uploadImageFromBase64(
    base64Data: string,
    options?: UploadOptions,
  ): Promise<UploadResult>;

  /**
   * Delete an uploaded image
   *
   * @param publicId - Public ID of the image to delete
   * @returns True if deleted successfully
   */
  deleteImage(publicId: string): Promise<boolean>;

  /**
   * Get the provider name (for logging/debugging)
   *
   * @returns Provider name (e.g., "Cloudinary", "AWS S3")
   */
  getProviderName(): string;
}
