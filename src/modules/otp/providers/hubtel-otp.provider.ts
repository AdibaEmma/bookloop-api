import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  IOTPProvider,
  SendOtpResponse,
} from '../interfaces/otp-provider.interface';

@Injectable()
export class HubtelOTPProvider implements IOTPProvider {
  private readonly logger = new Logger(HubtelOTPProvider.name);
  private readonly httpClient: AxiosInstance;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly senderId: string;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.getOrThrow<string>(
      'HUBTEL_SMS_CLIENT_ID',
    );
    this.clientSecret = this.configService.getOrThrow<string>(
      'HUBTEL_SMS_CLIENT_SECRET',
    );
    this.senderId =
      this.configService.get<string>('HUBTEL_SMS_SENDER_ID') || 'BookLoop';

    // Create axios instance with basic auth
    this.httpClient = axios.create({
      baseURL: 'https://smsapi.hubtel.com/v1',
      auth: {
        username: this.clientId,
        password: this.clientSecret,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async sendOTP(phone: string, code: string): Promise<SendOtpResponse> {
    try {
      const message = `Your BookLoop verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;

      const response = await this.httpClient.post('/messages/send', {
        From: this.senderId,
        To: phone,
        Content: message,
      });

      this.logger.log(
        `OTP sent via Hubtel to ${phone}, MessageId: ${response.data.MessageId}`,
      );

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      return {
        success: true,
        reference: response.data.MessageId || `hubtel_${Date.now()}`,
        message: 'OTP sent successfully via Hubtel',
        expiresAt,
      };
    } catch (error: any) {
      this.logger.error(
        `Hubtel OTP failed for ${phone}: ${error.message}`,
        error.stack,
      );
      throw new Error(`Hubtel OTP service error: ${error.message}`);
    }
  }

  getProviderName(): string {
    return 'hubtel';
  }
}
