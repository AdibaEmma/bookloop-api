import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  IOTPProvider,
  SendOtpResponse,
} from '../interfaces/otp-provider.interface';

@Injectable()
export class TermiiOTPProvider implements IOTPProvider {
  private readonly logger = new Logger(TermiiOTPProvider.name);
  private readonly httpClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly channel: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('TERMII_API_KEY');
    this.senderId =
      this.configService.get<string>('TERMII_SENDER_ID') || 'BookLoop';
    this.channel =
      this.configService.get<string>('TERMII_CHANNEL') || 'generic';

    this.httpClient = axios.create({
      baseURL: 'https://api.ng.termii.com/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async sendOTP(phone: string, code: string): Promise<SendOtpResponse> {
    try {
      const message = `Your BookLoop verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;

      const response = await this.httpClient.post('/sms/send', {
        to: phone,
        from: this.senderId,
        sms: message,
        type: 'plain',
        channel: this.channel,
        api_key: this.apiKey,
      });

      this.logger.log(
        `OTP sent via Termii to ${phone}, MessageId: ${response.data.message_id}`,
      );

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      return {
        success: true,
        reference: response.data.message_id || `termii_${Date.now()}`,
        message: 'OTP sent successfully via Termii',
        expiresAt,
      };
    } catch (error: any) {
      this.logger.error(
        `Termii OTP failed for ${phone}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Termii OTP service error: ${error.message}`);
    }
  }

  getProviderName(): string {
    return 'termii';
  }
}
