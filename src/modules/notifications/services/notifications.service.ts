import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification, NotificationType } from '../entities/notification.entity';
import { UserDevice } from '../entities/user-device.entity';
import { RegisterDeviceDto } from '../dto/register-device.dto';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { FCMService } from './fcm.service';
import { ExpoPushService, PushBatchResult } from './expo-push.service';
import { LoggerService } from '../../../common/logger/logger.service';

/**
 * NotificationsService
 *
 * Handles notification CRUD operations and push notification delivery.
 *
 * Features:
 * - Create in-app notifications
 * - Send push notifications via FCM
 * - Device registration management
 * - Notification queries and pagination
 * - Mark as read functionality
 * - Batch operations
 *
 * SOLID Principles:
 * - Single Responsibility: Handles notification business logic
 * - Dependency Inversion: Depends on FCMService abstraction
 */
@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(UserDevice)
    private userDeviceRepository: Repository<UserDevice>,
    private fcmService: FCMService,
    private expoPushService: ExpoPushService,
    private logger: LoggerService,
  ) {}

  // ============================================
  // Device Registration
  // ============================================

  /**
   * Register a user device for push notifications
   */
  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    // Check if device already exists
    let device = await this.userDeviceRepository.findOne({
      where: { device_token: dto.fcm_token },
    });

    if (device) {
      // Update existing device
      device.user_id = userId;
      device.device_type = dto.device_type;
      if (dto.device_name !== undefined) {
        device.device_name = dto.device_name;
      }
      device.is_active = true;
      device.last_used_at = new Date();
    } else {
      // Create new device
      device = this.userDeviceRepository.create({
        user_id: userId,
        device_token: dto.fcm_token,
        device_type: dto.device_type,
        device_name: dto.device_name,
        is_active: true,
        last_used_at: new Date(),
      });
    }

    await this.userDeviceRepository.save(device);

    return {
      message: 'Device registered successfully',
      device_id: device.id,
    };
  }

  /**
   * Unregister a device (remove device token)
   */
  async unregisterDevice(userId: string, deviceToken: string) {
    const result = await this.userDeviceRepository.delete({
      user_id: userId,
      device_token: deviceToken,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Device not found');
    }

    return { message: 'Device unregistered successfully' };
  }

  /**
   * Get user's registered devices
   */
  async getUserDevices(userId: string) {
    return this.userDeviceRepository.find({
      where: { user_id: userId, is_active: true },
      order: { last_used_at: 'DESC' },
    });
  }

  /**
   * Remove invalid device tokens
   */
  async removeInvalidTokens(tokens: string[]) {
    if (tokens.length === 0) return;

    await this.userDeviceRepository.delete({
      device_token: In(tokens),
    });

    this.logger.log(`Removed ${tokens.length} invalid device tokens`);
  }

  // ============================================
  // Push Notifications
  // ============================================


  /**
   * Route tokens to the right transport: Expo tokens go through Expo's push
   * API (FCM rejects them); anything else goes to FCM directly.
   */
  private async dispatchPush(
    tokens: string[],
    message: { title: string; body: string; data?: Record<string, string> },
  ): Promise<PushBatchResult> {
    const expoTokens = tokens.filter((t) => ExpoPushService.isExpoToken(t));
    const fcmTokens = tokens.filter((t) => !ExpoPushService.isExpoToken(t));

    const results = await Promise.all([
      expoTokens.length
        ? this.expoPushService.sendToMultipleTokens(expoTokens, message)
        : Promise.resolve({ success: 0, failed: 0, invalidTokens: [] }),
      fcmTokens.length
        ? this.fcmService.sendToMultipleTokens(fcmTokens, message)
        : Promise.resolve({ success: 0, failed: 0, invalidTokens: [] }),
    ]);

    return {
      success: results[0].success + results[1].success,
      failed: results[0].failed + results[1].failed,
      invalidTokens: [...results[0].invalidTokens, ...results[1].invalidTokens],
    };
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
    // Get all active user devices
    const devices = await this.userDeviceRepository.find({
      where: { user_id: userId, is_active: true },
    });

    if (devices.length === 0) {
      this.logger.warn(`No devices found for user ${userId}`);
      return { sent: false, reason: 'No devices registered' };
    }

    const tokens = devices.map((d) => d.device_token);

    // Convert data to string map (FCM requirement)
    const stringData = data ? this.stringifyData(data) : undefined;

    const result = await this.dispatchPush(tokens, {
      title,
      body,
      data: stringData,
    });

    // Remove invalid tokens
    if (result.invalidTokens.length > 0) {
      await this.removeInvalidTokens(result.invalidTokens);
    }

    return {
      sent: result.success > 0,
      successCount: result.success,
      failureCount: result.failed,
    };
  }

  /**
   * Send push notification to multiple users
   */
  async sendPushToMultipleUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    // Get all active devices for these users
    const devices = await this.userDeviceRepository.find({
      where: { user_id: In(userIds), is_active: true },
    });

    if (devices.length === 0) {
      return { sent: false, reason: 'No devices registered' };
    }

    const tokens = devices.map((d) => d.device_token);
    const stringData = data ? this.stringifyData(data) : undefined;

    const result = await this.dispatchPush(tokens, {
      title,
      body,
      data: stringData,
    });

    // Remove invalid tokens
    if (result.invalidTokens.length > 0) {
      await this.removeInvalidTokens(result.invalidTokens);
    }

    return {
      sent: result.success > 0,
      successCount: result.success,
      failureCount: result.failed,
    };
  }

  // ============================================
  // In-App Notifications
  // ============================================

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
      is_read: false,
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
      type,
      notification_id: notification.id,
    });

    return notification;
  }

  /**
   * Send notification to multiple users
   */
  async sendNotificationToMultipleUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
  ) {
    // Create in-app notifications for all users
    const notifications = userIds.map((userId) =>
      this.notificationRepository.create({
        user_id: userId,
        type,
        title,
        message,
        data,
        is_read: false,
      }),
    );

    await this.notificationRepository.save(notifications);

    // Send push notifications
    await this.sendPushToMultipleUsers(userIds, title, message, {
      ...data,
      type,
    });

    return notifications;
  }

  // ============================================
  // Notification Queries
  // ============================================

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
      where: { user_id: userId, is_read: false },
    });

    return { count };
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(userId: string, notificationId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, user_id: userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  // ============================================
  // Notification Updates
  // ============================================

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

    notification.is_read = true;
    notification.read_at = new Date();
    await this.notificationRepository.save(notification);

    return notification;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    await this.notificationRepository.update(
      { user_id: userId, is_read: false },
      { is_read: true, read_at: new Date() },
    );

    return { message: 'All notifications marked as read' };
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(userId: string, notificationIds: string[]) {
    await this.notificationRepository.update(
      { id: In(notificationIds), user_id: userId, is_read: false },
      { is_read: true, read_at: new Date() },
    );

    return { message: `Marked ${notificationIds.length} notifications as read` };
  }

  // ============================================
  // Notification Deletion
  // ============================================

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
      is_read: true,
    });

    return {
      message: `Deleted ${result.affected} notifications`,
      count: result.affected,
    };
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: string) {
    const result = await this.notificationRepository.delete({
      user_id: userId,
    });

    return {
      message: `Deleted ${result.affected} notifications`,
      count: result.affected,
    };
  }

  /**
   * Delete notifications older than specified days
   */
  async deleteOldNotifications(days: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Deleted ${result.affected} notifications older than ${days} days`);

    return {
      message: `Deleted ${result.affected} old notifications`,
      count: result.affected,
    };
  }

  // ============================================
  // Helpers
  // ============================================

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
