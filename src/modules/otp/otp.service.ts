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
import { randomInt, randomBytes } from 'node:crypto';
import { LoggerService } from '../../common/logger/logger.service';
import { OtpVerification } from './entities/otp-verification.entity';
import { OtpEmailJob } from '../../common/queues/otp-email.processor';
import { OTP_SMS_PROVIDER } from './otp.constants';
import type { IOTPProvider } from './interfaces/otp-provider.interface';

export type OtpChannel = 'email' | 'sms';

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
    @Inject(OTP_SMS_PROVIDER)
    private smsProvider: IOTPProvider,
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
   * Generate and send an OTP.
   *
   * `identifier` is the lookup key + destination: an email when channel is
   * 'email' (queued to the mail worker) or a phone number when channel is
   * 'sms' (sent immediately via the configured SMS provider). Defaults to
   * 'email' so existing callers are unchanged.
   */
  async sendOTP(
    identifier: string,
    purpose:
      | 'registration'
      | 'login'
      | 'password_reset'
      | 'email_verification',
    channel: OtpChannel = 'email',
  ): Promise<{ reference: string; expiresAt: Date }> {
    // Check rate limiting
    await this.checkRateLimit(identifier);

    // Generate alphanumeric code (6-8 characters)
    const code = this.generateOTPCode();

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.otpExpiryMinutes);

    // Generate unique, unguessable reference (Math.random is predictable).
    const reference = `otp_${Date.now()}_${randomBytes(9).toString('hex')}`;

    try {
      // Save OTP to database. The `email` column doubles as a generic
      // identifier column (holds a phone number for SMS OTPs).
      const otp = this.otpRepository.create({
        email: identifier,
        code,
        reference,
        provider: channel === 'sms' ? this.smsProvider.getProviderName() : 'email',
        expires_at: expiresAt,
        purpose,
        attempts: 0,
        verified: false,
      });

      await this.otpRepository.save(otp);

      if (channel === 'sms') {
        // The OTP row is already persisted, so the code is valid the moment it
        // is saved. Deliver the SMS out-of-band (fire-and-forget) so the
        // provider's network latency never blocks — and never times out — the
        // login/registration request. Delivery failures are logged; the user
        // can resend if the SMS doesn't arrive.
        void this.smsProvider
          .sendOTP(identifier, code)
          .then(() =>
            this.logger.log(
              `OTP sent to ${identifier} via ${this.smsProvider.getProviderName()}`,
              'OtpService',
            ),
          )
          .catch((err: any) =>
            this.logger.error(
              `SMS OTP delivery failed for ${identifier}: ${err?.message}`,
              err?.stack,
              'OtpService',
            ),
          );
      } else {
        // Queue email for sending.
        await this.otpEmailQueue.add('send', {
          email: identifier,
          code,
          purpose,
        });
        this.logger.log(`OTP queued for ${identifier} via email`, 'OtpService');
      }

      // Set rate limit
      await this.setRateLimit(identifier);

      return {
        reference,
        expiresAt,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to send OTP to ${identifier}: ${error.message}`,
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
    // Look up the latest unverified OTP for this identifier — NOT filtered by the
    // submitted code. Filtering by code meant a wrong guess matched no row and
    // returned before attempts were counted, so the lockout never fired and the
    // code was brute-forceable.
    const otp = await this.otpRepository.findOne({
      where: {
        email,
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

    // Count this attempt BEFORE comparing the code, so every wrong guess burns
    // the attempt budget and the lockout actually engages.
    otp.attempts += 1;
    await this.otpRepository.save(otp);

    // Verify code
    if (otp.code !== code) {
      throw new UnauthorizedException(
        `Invalid OTP. ${Math.max(0, this.maxAttempts - otp.attempts)} attempts remaining.`,
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
      // Generate 6-character alphanumeric code with a CSPRNG (Math.random is not
      // cryptographically secure and is predictable).
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let out = '';
      for (let i = 0; i < 6; i++) out += chars[randomInt(0, chars.length)];
      return out;
    } else {
      // Generate a 6-digit numeric code across the full 000000–999999 space.
      return randomInt(0, 1_000_000).toString().padStart(6, '0');
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
