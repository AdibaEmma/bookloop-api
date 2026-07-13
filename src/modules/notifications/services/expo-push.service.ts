import { Injectable, Logger } from '@nestjs/common';
import { FCMMessage } from './fcm.service';

export interface PushBatchResult {
  success: number;
  failed: number;
  invalidTokens: string[];
}

/**
 * ExpoPushService
 *
 * Delivers pushes to Expo push tokens (ExponentPushToken[...]) through the
 * Expo push API. The mobile app registers Expo tokens — FCM cannot deliver
 * to them, so they must be relayed through Expo, which forwards to
 * APNs/FCM using the project's stored credentials.
 *
 * SOLID: mirrors FCMService's shape so NotificationsService can route by
 * token format without caring which transport delivers.
 */
@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);
  private static readonly ENDPOINT = 'https://exp.host/--/api/v2/push/send';
  private static readonly CHUNK_SIZE = 100; // Expo's per-request limit

  static isExpoToken(token: string): boolean {
    return /^Expo(nent)?PushToken\[.+\]$/.test(token);
  }

  async sendToMultipleTokens(
    tokens: string[],
    message: FCMMessage,
  ): Promise<PushBatchResult> {
    const result: PushBatchResult = { success: 0, failed: 0, invalidTokens: [] };
    if (tokens.length === 0) return result;

    for (let i = 0; i < tokens.length; i += ExpoPushService.CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + ExpoPushService.CHUNK_SIZE);
      const payload = chunk.map((to) => ({
        to,
        title: message.title,
        body: message.body,
        data: message.data,
        sound: 'default' as const,
      }));

      try {
        const res = await fetch(ExpoPushService.ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json: any = await res.json();
        const tickets: any[] = Array.isArray(json?.data) ? json.data : [];

        tickets.forEach((ticket, idx) => {
          if (ticket?.status === 'ok') {
            result.success++;
            return;
          }
          result.failed++;
          const error = ticket?.details?.error;
          // DeviceNotRegistered is the only ticket error that means the token
          // itself is dead; credential/config errors must not delete tokens.
          if (error === 'DeviceNotRegistered') {
            result.invalidTokens.push(chunk[idx]);
          }
          this.logger.warn(
            `Expo push failed (${error ?? 'unknown'}): ${ticket?.message ?? 'no message'}`,
          );
        });
      } catch (err) {
        result.failed += chunk.length;
        this.logger.error(`Expo push request failed: ${(err as Error).message}`);
      }
    }

    return result;
  }
}
