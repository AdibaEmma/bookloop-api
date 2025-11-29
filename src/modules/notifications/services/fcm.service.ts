import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Message, MulticastMessage, BatchResponse } from 'firebase-admin/messaging';

export interface FCMMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  actionUrl?: string;
}

export interface FCMNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * FCMService
 *
 * Handles Firebase Cloud Messaging operations.
 *
 * Features:
 * - Firebase Admin SDK initialization
 * - Send to single device
 * - Send to multiple devices (multicast)
 * - Send to topics (broadcast)
 * - Topic subscription management
 * - Token validation
 *
 * SOLID Principles:
 * - Single Responsibility: Only handles FCM operations
 * - Separated from notification CRUD operations
 */
@Injectable()
export class FCMService implements OnModuleInit {
  private readonly logger = new Logger(FCMService.name);
  private messaging: admin.messaging.Messaging | null = null;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeFirebase();
  }

  private async initializeFirebase() {
    try {
      const serviceAccountPath = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
      const serviceAccountJson = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');

      let serviceAccount: admin.ServiceAccount;

      if (serviceAccountJson) {
        // Parse JSON from environment variable (production)
        try {
          serviceAccount = JSON.parse(serviceAccountJson);
          this.logger.log('Using Firebase service account from environment variable');
        } catch (error) {
          this.logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', error);
          return;
        }
      } else if (serviceAccountPath) {
        // Load from file path (development)
        try {
          const path = require('path');
          const fs = require('fs');

          // Resolve path relative to project root
          const absolutePath = path.resolve(process.cwd(), serviceAccountPath);

          if (fs.existsSync(absolutePath)) {
            const serviceAccountContent = fs.readFileSync(absolutePath, 'utf8');
            serviceAccount = JSON.parse(serviceAccountContent);
            this.logger.log(`Using Firebase service account from file: ${absolutePath}`);
          } else {
            throw new Error(`File not found: ${absolutePath}`);
          }
        } catch (error) {
          this.logger.error(`Failed to load service account from path ${serviceAccountPath}:`, error);
          return;
        }
      } else {
        this.logger.warn(
          'Firebase service account not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON',
        );
        return;
      }

      // Initialize Firebase Admin if not already initialized
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }

      this.messaging = admin.messaging();
      this.initialized = true;
      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK:', error);
      this.initialized = false;
    }
  }

  /**
   * Send notification to a single device
   */
  async sendToToken(
    token: string,
    notification: FCMMessage,
    priority: 'high' | 'normal' = 'normal',
  ): Promise<FCMNotificationResult> {
    if (!this.initialized || !this.messaging) {
      this.logger.warn('FCM service not initialized, skipping notification');
      return { success: false, error: 'FCM service not initialized' };
    }

    try {
      const message: Message = {
        token,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: {
          ...notification.data,
          ...(notification.actionUrl && { actionUrl: notification.actionUrl }),
        },
        android: {
          priority,
          notification: {
            channelId: 'bookloop_default',
            sound: 'default',
            priority: priority === 'high' ? 'high' : 'default',
            defaultSound: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
        },
      };

      const response = await this.messaging.send(message);
      this.logger.log(`FCM notification sent successfully. Message ID: ${response}`);

      return {
        success: true,
        messageId: response,
      };
    } catch (error) {
      this.logger.error(`Failed to send FCM notification to token ${token.substring(0, 10)}...:`, error);
      return {
        success: false,
        error: error.message || 'Unknown FCM error',
      };
    }
  }

  /**
   * Send notification to multiple devices
   */
  async sendToMultipleTokens(
    tokens: string[],
    notification: FCMMessage,
    priority: 'high' | 'normal' = 'normal',
  ): Promise<{ success: number; failed: number; results: FCMNotificationResult[]; invalidTokens: string[] }> {
    if (!this.initialized || !this.messaging) {
      this.logger.warn('FCM service not initialized, skipping notifications');
      return {
        success: 0,
        failed: tokens.length,
        results: tokens.map(() => ({ success: false, error: 'FCM service not initialized' })),
        invalidTokens: [],
      };
    }

    if (tokens.length === 0) {
      return { success: 0, failed: 0, results: [], invalidTokens: [] };
    }

    // Split tokens into batches of 500 (FCM limit)
    const batchSize = 500;
    const batches: string[][] = [];
    for (let i = 0; i < tokens.length; i += batchSize) {
      batches.push(tokens.slice(i, i + batchSize));
    }

    const allResults: FCMNotificationResult[] = [];
    const invalidTokens: string[] = [];
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const batch of batches) {
      try {
        const message: MulticastMessage = {
          tokens: batch,
          notification: {
            title: notification.title,
            body: notification.body,
            imageUrl: notification.imageUrl,
          },
          data: {
            ...notification.data,
            ...(notification.actionUrl && { actionUrl: notification.actionUrl }),
          },
          android: {
            priority,
            notification: {
              channelId: 'bookloop_default',
              sound: 'default',
              priority: priority === 'high' ? 'high' : 'default',
              defaultSound: true,
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                contentAvailable: true,
              },
            },
          },
        };

        const response: BatchResponse = await this.messaging.sendEachForMulticast(message);

        // Process results
        response.responses.forEach((result, index) => {
          if (result.success) {
            totalSuccess++;
            allResults.push({
              success: true,
              messageId: result.messageId,
            });
          } else {
            totalFailed++;
            allResults.push({
              success: false,
              error: result.error?.message || 'Unknown error',
            });

            // Track invalid tokens for cleanup
            if (
              result.error?.code === 'messaging/invalid-registration-token' ||
              result.error?.code === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(batch[index]);
              this.logger.warn(`Invalid token detected: ${batch[index].substring(0, 10)}...`);
            }
          }
        });

        this.logger.log(
          `Batch sent: ${response.successCount} successful, ${response.failureCount} failed`,
        );
      } catch (error) {
        this.logger.error('Failed to send batch FCM notifications:', error);

        // Mark all tokens in this batch as failed
        batch.forEach(() => {
          totalFailed++;
          allResults.push({
            success: false,
            error: error.message || 'Batch send failed',
          });
        });
      }
    }

    this.logger.log(`FCM multicast complete: ${totalSuccess} successful, ${totalFailed} failed`);
    return {
      success: totalSuccess,
      failed: totalFailed,
      results: allResults,
      invalidTokens,
    };
  }

  /**
   * Send notification to a topic (for broadcasting)
   */
  async sendToTopic(
    topic: string,
    notification: FCMMessage,
    priority: 'high' | 'normal' = 'normal',
  ): Promise<FCMNotificationResult> {
    if (!this.initialized || !this.messaging) {
      this.logger.warn('FCM service not initialized, skipping topic notification');
      return { success: false, error: 'FCM service not initialized' };
    }

    try {
      const message: Message = {
        topic,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: {
          ...notification.data,
          ...(notification.actionUrl && { actionUrl: notification.actionUrl }),
        },
        android: {
          priority,
          notification: {
            channelId: 'bookloop_default',
            sound: 'default',
            priority: priority === 'high' ? 'high' : 'default',
            defaultSound: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
        },
      };

      const response = await this.messaging.send(message);
      this.logger.log(`FCM topic notification sent successfully. Message ID: ${response}`);

      return {
        success: true,
        messageId: response,
      };
    } catch (error) {
      this.logger.error(`Failed to send FCM notification to topic ${topic}:`, error);
      return {
        success: false,
        error: error.message || 'Unknown FCM error',
      };
    }
  }

  /**
   * Subscribe tokens to a topic
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.initialized || !this.messaging) {
      this.logger.warn('FCM service not initialized, skipping topic subscription');
      return;
    }

    try {
      const response = await this.messaging.subscribeToTopic(tokens, topic);
      this.logger.log(`Subscribed ${response.successCount} tokens to topic ${topic}`);

      if (response.failureCount > 0) {
        this.logger.warn(`Failed to subscribe ${response.failureCount} tokens to topic ${topic}`);
      }
    } catch (error) {
      this.logger.error(`Failed to subscribe tokens to topic ${topic}:`, error);
    }
  }

  /**
   * Unsubscribe tokens from a topic
   */
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.initialized || !this.messaging) {
      this.logger.warn('FCM service not initialized, skipping topic unsubscription');
      return;
    }

    try {
      const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
      this.logger.log(`Unsubscribed ${response.successCount} tokens from topic ${topic}`);

      if (response.failureCount > 0) {
        this.logger.warn(`Failed to unsubscribe ${response.failureCount} tokens from topic ${topic}`);
      }
    } catch (error) {
      this.logger.error(`Failed to unsubscribe tokens from topic ${topic}:`, error);
    }
  }

  /**
   * Validate if a token is valid (dry run)
   */
  async validateToken(token: string): Promise<boolean> {
    if (!this.initialized || !this.messaging) {
      return false;
    }

    try {
      // Use dryRun to validate without actually sending
      await this.messaging.send(
        {
          token,
          data: { test: 'validation' },
        },
        true, // dryRun
      );
      return true;
    } catch (error: any) {
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        return false;
      }

      // Other errors might be temporary, so we'll consider the token valid
      this.logger.warn(`Token validation error (treating as valid): ${error.message}`);
      return true;
    }
  }

  /**
   * Check if FCM service is properly initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
