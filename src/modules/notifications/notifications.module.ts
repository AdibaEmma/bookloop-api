import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { FCMService } from './services/fcm.service';
import { ExpoPushService } from './services/expo-push.service';
import { Notification } from './entities/notification.entity';
import { UserDevice } from './entities/user-device.entity';

/**
 * NotificationsModule
 *
 * Provides notification and push notification functionality.
 *
 * Services:
 * - NotificationsService: Notification CRUD operations
 * - FCMService: Firebase Cloud Messaging operations
 *
 * Exports NotificationsService for use in other modules
 * (e.g., ExchangesModule for sending exchange notifications)
 */
@Module({
  imports: [TypeOrmModule.forFeature([Notification, UserDevice])],
  controllers: [NotificationsController],
  providers: [FCMService, ExpoPushService, NotificationsService],
  exports: [NotificationsService, FCMService],
})
export class NotificationsModule {}
