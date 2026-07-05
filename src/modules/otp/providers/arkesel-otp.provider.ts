import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  IOTPProvider,
  SendOtpResponse,
} from '../interfaces/otp-provider.interface';

/**
 * Arkesel OTP provider (Ghana SMS gateway).
 *
 * Uses Arkesel's SMS v2 API to deliver the code that OtpService generates and
 * stores (we manage the code/expiry ourselves, so this only needs to send an
 * SMS — not Arkesel's own generate/verify OTP endpoints).
 *
 * Env:
 *   ARKESEL_API_KEY    (required when OTP_PROVIDER=arkesel)
 *   ARKESEL_SENDER_ID  (optional, default "BookLoop"; max 11 chars, must be
 *                       an approved sender ID on your Arkesel account)
 */
@Injectable()
export class ArkeselOTPProvider implements IOTPProvider {
  private readonly logger = new Logger(ArkeselOTPProvider.name);
  private readonly httpClient: AxiosInstance;
  private readonly senderId: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('ARKESEL_API_KEY');
    this.senderId =
      this.configService.get<string>('ARKESEL_SENDER_ID') || 'BookLoop';

    this.httpClient = axios.create({
      baseURL: 'https://sms.arkesel.com/api/v2',
      timeout: 15000,
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Arkesel expects MSISDN without the leading "+" (e.g. 233501234567).
   */
  private normalizeRecipient(phone: string): string {
    return phone.replace(/[^\d]/g, '');
  }

  async sendOTP(phone: string, code: string): Promise<SendOtpResponse> {
    const recipient = this.normalizeRecipient(phone);
    const message = `Your BookLoop verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;

    try {
      const response = await this.httpClient.post('/sms/send', {
        sender: this.senderId,
        message,
        recipients: [recipient],
      });

      // Arkesel returns { status: "success", data: [{ recipient, id, ... }] }
      const data = response.data;
      if (data?.status && data.status !== 'success') {
        throw new Error(data.message || `Arkesel status: ${data.status}`);
      }

      const reference =
        data?.data?.[0]?.id || data?.data?.id || `arkesel_${Date.now()}`;

      this.logger.log(`OTP sent via Arkesel to ${recipient}, ref: ${reference}`);

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      return {
        success: true,
        reference,
        message: 'OTP sent successfully via Arkesel',
        expiresAt,
      };
    } catch (error: any) {
      const detail = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
      this.logger.error(`Arkesel OTP failed for ${recipient}: ${detail}`);
      throw new Error(`Arkesel OTP service error: ${error.message}`);
    }
  }

  getProviderName(): string {
    return 'arkesel';
  }
}
