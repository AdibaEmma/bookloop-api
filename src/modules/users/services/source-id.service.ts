import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * SourceID Ghana Card verification.
 *
 * When real credentials are configured (SOURCEID_API_KEY set to something other
 * than the placeholder), a submitted card number is auto-verified against the
 * SourceID API. Otherwise verification is skipped and the submission falls back
 * to manual admin approval.
 *
 * NOTE: the request/response mapping below follows a conventional REST shape and
 * should be adjusted to match SourceID's actual API contract when you wire in
 * live credentials. It is intentionally defensive — any error or ambiguous
 * response yields `false` (not verified), so a bad integration never
 * auto-approves an identity.
 */
@Injectable()
export class SourceIdService {
  private readonly logger = new Logger(SourceIdService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly http: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('SOURCEID_API_KEY') || '';
    this.baseUrl =
      this.config.get<string>('SOURCEID_API_URL') || 'https://api.sourceid.com';

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * True only when a real API key is present (not empty / not the .env.example
   * placeholder).
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_sourceid_api_key';
  }

  /**
   * Verify a Ghana Card number. Returns true only on an unambiguous verified
   * response; false on any error, timeout, or unexpected payload.
   */
  async verifyGhanaCard(cardNumber: string): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      const res = await this.http.post('/v1/verifications/ghana-card', {
        id_number: cardNumber,
      });

      const data = res.data ?? {};
      const verified =
        data.verified === true ||
        data.status === 'verified' ||
        data.result?.verified === true;

      this.logger.log(
        `SourceID verification for ${cardNumber}: ${verified ? 'verified' : 'not verified'}`,
      );
      return verified === true;
    } catch (error: any) {
      const detail = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
      this.logger.warn(
        `SourceID verification failed for ${cardNumber} (falling back to manual): ${detail}`,
      );
      return false;
    }
  }
}
