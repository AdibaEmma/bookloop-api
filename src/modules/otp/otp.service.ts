import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { LoggerService } from '../../common/logger/logger.service';
import { OtpVerification } from './entities/otp-verification.entity';
import { OtpEmailJob } from '../../common/queues/otp-email.processor';

@Injectable()
export class OtpService {
  private readonly otpExpiryMinutes: number;
  private readonly maxAttempts: number;
  private readonly resendCooldownSeconds: number;

  constructor(
    @InjectRepository(OtpVerification)
    private otpRepository: Repository<OtpVerification>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    @InjectQueue('otpEmail')
    private otpEmailQueue: Queue<OtpEmailJob>,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    // Configuration
    this.otpExpiryMinutes =
      parseInt(this.configService.get<string>('OTP_EXPIRY_MINUTES') || '10') ||
      10;
    this.maxAttempts =
      parseInt(this.configService.get<string>('OTP_MAX_ATTEMPTS') || '3') || 3;
    this.resendCooldownSeconds =
      parseInt(
        this.configService.get<string>('OTP_RESEND_COOLDOWN_SECONDS') || '60',
      ) || 60;
  }

  /**
   * Generate and send OTP via email
   */
  async sendOTP(
    email: string,
    purpose:
      | 'registration'
      | 'login'
      | 'password_reset'
      | 'email_verification',
  ): Promise<{ reference: string; expiresAt: Date }> {
    // Check rate limiting
    await this.checkRateLimit(email);

    // Generate alphanumeric code (6-8 characters)
    const code = this.generateOTPCode();

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.otpExpiryMinutes);

    // Generate reference
    const reference = `otp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      // Save OTP to database
      const otp = this.otpRepository.create({
        email,
        code,
        reference,
        provider: 'email',
        expires_at: expiresAt,
        purpose,
        attempts: 0,
        verified: false,
      });

      await this.otpRepository.save(otp);

      // Queue email for sending
      await this.otpEmailQueue.add('send', {
        email,
        code,
        purpose,
      });

      // Set rate limit
      await this.setRateLimit(email);

      this.logger.log(`OTP queued for ${email} via email`, 'OtpService');

      return {
        reference,
        expiresAt,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to send OTP to ${email}: ${error.message}`,
        error.stack,
        'OtpService',
      );
      throw new BadRequestException(
        'Unable to send OTP. Please try again later.',
      );
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(email: string, code: string): Promise<boolean> {
    // Find the most recent OTP for this email
    const otp = await this.otpRepository.findOne({
      where: {
        email,
        code,
        verified: false,
      },
      order: {
        created_at: 'DESC',
      },
    });

    if (!otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Check if expired
    if (new Date() > otp.expires_at) {
      throw new UnauthorizedException('OTP has expired');
    }

    // Check max attempts
    if (otp.attempts >= this.maxAttempts) {
      throw new UnauthorizedException(
        'Maximum verification attempts exceeded',
      );
    }

    // Increment attempts
    otp.attempts += 1;
    await this.otpRepository.save(otp);

    // Verify code
    if (otp.code !== code) {
      throw new UnauthorizedException(
        `Invalid OTP. ${this.maxAttempts - otp.attempts} attempts remaining.`,
      );
    }

    // Mark as verified
    otp.verified = true;
    otp.verified_at = new Date();
    await this.otpRepository.save(otp);

    // Clear rate limit
    await this.clearRateLimit(email);

    this.logger.log(`OTP verified successfully for ${email}`, 'OtpService');

    return true;
  }

  /**
   * Check if email can request OTP (rate limiting)
   */
  private async checkRateLimit(email: string): Promise<void> {
    const key = `otp:ratelimit:${email}`;
    const lastSent = await this.cacheManager.get<number>(key);

    if (lastSent) {
      const elapsed = Date.now() - lastSent;
      const remaining = this.resendCooldownSeconds * 1000 - elapsed;

      if (remaining > 0) {
        throw new BadRequestException(
          `Please wait ${Math.ceil(remaining / 1000)} seconds before requesting another OTP`,
        );
      }
    }
  }

  /**
   * Set rate limit for email
   */
  private async setRateLimit(email: string): Promise<void> {
    const key = `otp:ratelimit:${email}`;
    await this.cacheManager.set(
      key,
      Date.now(),
      this.resendCooldownSeconds * 1000,
    );
  }

  /**
   * Clear rate limit for email
   */
  private async clearRateLimit(email: string): Promise<void> {
    const key = `otp:ratelimit:${email}`;
    await this.cacheManager.del(key);
  }

  /**
   * Generate alphanumeric OTP code (6 characters)
   * Can be numeric or alphanumeric based on configuration
   */
  private generateOTPCode(): string {
    const useAlphanumeric = this.configService.get<string>(
      'OTP_USE_ALPHANUMERIC',
    );

    if (useAlphanumeric === 'true') {
      // Generate 6-character alphanumeric code
      return Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
    } else {
      // Generate 6-digit numeric code
      return Math.floor(100000 + Math.random() * 900000).toString();
    }
  }

  /**
   * Clean up expired OTPs (can be run via cron)
   */
  async cleanupExpiredOTPs(): Promise<number> {
    const result = await this.otpRepository.delete({
      expires_at: LessThan(new Date()),
      verified: false,
    });

    this.logger.log(
      `Cleaned up ${result.affected || 0} expired OTPs`,
      'OtpService',
    );

    return result.affected || 0;
  }
}
