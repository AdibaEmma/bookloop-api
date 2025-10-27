import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../common/logger/logger.service';
import { OtpVerification } from './entities/otp-verification.entity';
import { IOTPProvider } from './interfaces/otp-provider.interface';
import { HubtelOTPProvider } from './providers/hubtel-otp.provider';
import { TermiiOTPProvider } from './providers/termii-otp.provider';
import { MockOTPProvider } from './providers/mock-otp.provider';

@Injectable()
export class OtpService {
  private readonly providers: IOTPProvider[];
  private readonly otpExpiryMinutes: number;
  private readonly maxAttempts: number;
  private readonly resendCooldownSeconds: number;

  constructor(
    @InjectRepository(OtpVerification)
    private otpRepository: Repository<OtpVerification>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private configService: ConfigService,
    private logger: LoggerService,
    private hubtelProvider: HubtelOTPProvider,
    private termiiProvider: TermiiOTPProvider,
    private mockProvider: MockOTPProvider,
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

    // Set up provider fallback chain
    const env = this.configService.get<string>('NODE_ENV');
    if (env === 'development' || env === 'test') {
      this.providers = [this.mockProvider];
    } else {
      // Production: Hubtel -> Termii fallback
      this.providers = [this.hubtelProvider, this.termiiProvider];
    }
  }

  /**
   * Generate and send OTP
   */
  async sendOTP(
    phone: string,
    purpose:
      | 'registration'
      | 'login'
      | 'password_reset'
      | 'phone_verification',
  ): Promise<{ reference: string; expiresAt: Date }> {
    // Check rate limiting
    await this.checkRateLimit(phone);

    // Generate 6-digit code
    const code = this.generateOTPCode();

    // Try providers with fallback
    let lastError: Error | null = null;
    for (const provider of this.providers) {
      try {
        const result = await provider.sendOTP(phone, code);

        // Save OTP to database
        const otp = this.otpRepository.create({
          phone,
          code,
          reference: result.reference,
          provider: provider.getProviderName(),
          expires_at: result.expiresAt,
          purpose,
          attempts: 0,
          verified: false,
        });

        await this.otpRepository.save(otp);

        // Set rate limit
        await this.setRateLimit(phone);

        this.logger.log(
          `OTP sent to ${phone} via ${provider.getProviderName()}`,
          'OtpService',
        );

        return {
          reference: result.reference,
          expiresAt: result.expiresAt,
        };
      } catch (error: any) {
        this.logger.warn(
          `Provider ${provider.getProviderName()} failed: ${error.message}`,
          'OtpService',
        );
        lastError = error;
        // Continue to next provider
      }
    }

    // All providers failed
    this.logger.error(
      `All OTP providers failed for ${phone}`,
      lastError?.stack,
      'OtpService',
    );
    throw new BadRequestException(
      'Unable to send OTP. Please try again later.',
    );
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(phone: string, code: string): Promise<boolean> {
    // Find the most recent OTP for this phone
    const otp = await this.otpRepository.findOne({
      where: {
        phone,
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
    await this.clearRateLimit(phone);

    this.logger.log(`OTP verified successfully for ${phone}`, 'OtpService');

    return true;
  }

  /**
   * Check if phone can request OTP (rate limiting)
   */
  private async checkRateLimit(phone: string): Promise<void> {
    const key = `otp:ratelimit:${phone}`;
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
   * Set rate limit for phone
   */
  private async setRateLimit(phone: string): Promise<void> {
    const key = `otp:ratelimit:${phone}`;
    await this.cacheManager.set(
      key,
      Date.now(),
      this.resendCooldownSeconds * 1000,
    );
  }

  /**
   * Clear rate limit for phone
   */
  private async clearRateLimit(phone: string): Promise<void> {
    const key = `otp:ratelimit:${phone}`;
    await this.cacheManager.del(key);
  }

  /**
   * Generate 6-digit OTP code
   */
  private generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
