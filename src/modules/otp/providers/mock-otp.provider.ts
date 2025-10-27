import { Injectable, Logger } from '@nestjs/common';
import {
  IOTPProvider,
  SendOtpResponse,
} from '../interfaces/otp-provider.interface';

/**
 * Mock OTP Provider for development and testing
 * Logs OTP codes instead of sending SMS
 */
@Injectable()
export class MockOTPProvider implements IOTPProvider {
  private readonly logger = new Logger(MockOTPProvider.name);

  async sendOTP(phone: string, code: string): Promise<SendOtpResponse> {
    this.logger.warn(
      `[DEVELOPMENT] OTP for ${phone}: ${code} (valid for 10 minutes)`,
    );
    this.logger.warn(
      `[DEVELOPMENT] This is a mock provider. No actual SMS was sent.`,
    );

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    return {
      success: true,
      reference: `mock_${Date.now()}`,
      message: 'OTP logged to console (development mode)',
      expiresAt,
    };
  }

  getProviderName(): string {
    return 'mock';
  }
}
