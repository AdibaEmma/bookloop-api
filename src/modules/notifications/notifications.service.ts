import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Notification, NotificationType } from './entities/notification.entity';
import { UserDevice, DeviceType } from './entities/user-device.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { LoggerService } from '../../common/logger/logger.service';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private firebaseApp: admin.app.App;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(UserDevice)
    private userDeviceRepository: Repository<UserDevice>,
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private initializeFirebase() {
    try {
      const serviceAccountKey = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_KEY');

      if (!serviceAccountKey) {
        this.logger.warn('Firebase service account key not configured. Push notifications will be disabled.');
        return;
      }

      const serviceAccount = JSON.parse(serviceAccountKey);

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error.stack);
    }
  }

  /**
   * Register a user device for push notifications
   */
  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    // Check if device already exists
    let device = await this.userDeviceRepository.findOne({
      where: { fcm_token: dto.fcm_token },
    });

    if (device) {
      // Update existing device
      device.user_id = userId;
      device.device_type = dto.device_type;
      if (dto.device_name !== undefined) {
        device.device_name = dto.device_name;
      }
      device.last_active_at = new Date();
    } else {
      // Create new device
      device = this.userDeviceRepository.create({
        user_id: userId,
        fcm_token: dto.fcm_token,
        device_type: dto.device_type,
        device_name: dto.device_name,
        last_active_at: new Date(),
      });
    }

    await this.userDeviceRepository.save(device);

    return {
      message: 'Device registered successfully',
      device_id: device.id,
    };
  }

  /**
   * Unregister a device (remove FCM token)
   */
  async unregisterDevice(userId: string, fcmToken: string) {
    const result = await this.userDeviceRepository.delete({
      user_id: userId,
      fcm_token: fcmToken,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Device not found');
    }

    return { message: 'Device unregistered successfully' };
  }

  /**
   * Send push notification to a specific user
   */
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    if (!this.firebaseApp) {
      this.logger.warn('Firebase not initialized. Skipping push notification.');
      return { sent: false, reason: 'Firebase not configured' };
    }

    // Get all user devices
    const devices = await this.userDeviceRepository.find({
      where: { user_id: userId },
    });

    if (devices.length === 0) {
      this.logger.warn(`No devices found for user ${userId}`);
      return { sent: false, reason: 'No devices registered' };
    }

    const tokens = devices.map((d) => d.fcm_token);

    try {
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title,
          body,
        },
        data: data ? this.stringifyData(data) : undefined,
        tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      // Remove invalid tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && tokens[idx]) {
            failedTokens.push(tokens[idx]);
          }
        });

        if (failedTokens.length > 0) {
          await this.userDeviceRepository.delete({
            fcm_token: { $in: failedTokens } as any,
          });
          this.logger.log(`Removed ${failedTokens.length} invalid FCM tokens`);
        }
      }

      this.logger.log(`Push notification sent to ${response.successCount}/${tokens.length} devices`);

      return {
        sent: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      this.logger.error('Failed to send push notification', error.stack);
      return { sent: false, reason: error.message };
    }
  }

  /**
   * Create in-app notification
   */
  async createNotification(userId: string, dto: CreateNotificationDto) {
    const notification = this.notificationRepository.create({
      user_id: userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data,
      read: false,
    });

    await this.notificationRepository.save(notification);

    return notification;
  }

  /**
   * Send both push notification and create in-app notification
   */
  async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
  ) {
    // Create in-app notification
    const notification = await this.createNotification(userId, {
      type,
      title,
      message,
      data,
    });

    // Send push notification
    await this.sendPushNotification(userId, title, message, {
      ...data,
      notification_id: notification.id,
    });

    return notification;
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(userId: string, limit = 20, offset = 0) {
    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      data: notifications,
      total,
      limit,
      offset,
      has_more: offset + limit < total,
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string) {
    const count = await this.notificationRepository.count({
      where: { user_id: userId, read: false },
    });

    return { count };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, user_id: userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.read = true;
    await this.notificationRepository.save(notification);

    return notification;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    await this.notificationRepository.update(
      { user_id: userId, read: false },
      { read: true },
    );

    return { message: 'All notifications marked as read' };
  }

  /**
   * Delete notification
   */
  async deleteNotification(userId: string, notificationId: string) {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      user_id: userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Notification not found');
    }

    return { message: 'Notification deleted successfully' };
  }

  /**
   * Delete all read notifications
   */
  async deleteReadNotifications(userId: string) {
    const result = await this.notificationRepository.delete({
      user_id: userId,
      read: true,
    });

    return {
      message: `Deleted ${result.affected} notifications`,
      count: result.affected,
    };
  }

  /**
   * Helper: Convert data object to string map (FCM requirement)
   */
  private stringifyData(data: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return result;
  }
}
