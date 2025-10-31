import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/entities/user.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('register-device')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register device for push notifications' })
  @ApiResponse({ status: 200, description: 'Device registered successfully' })
  async registerDevice(
    @CurrentUser() user: User,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.notificationsService.registerDevice(user.id, dto);
  }

  @Delete('unregister-device/:fcmToken')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unregister device from push notifications' })
  @ApiResponse({ status: 200, description: 'Device unregistered successfully' })
  async unregisterDevice(
    @CurrentUser() user: User,
    @Param('fcmToken') fcmToken: string,
  ) {
    return this.notificationsService.unregisterDevice(user.id, fcmToken);
  }

  @Get()
  @ApiOperation({ summary: 'Get user notifications with pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async getNotifications(
    @CurrentUser() user: User,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.notificationsService.getUserNotifications(
      user.id,
      limit ? parseInt(limit as any) : 20,
      offset ? parseInt(offset as any) : 0,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getUnreadCount(@CurrentUser() user: User) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  async deleteNotification(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.notificationsService.deleteNotification(user.id, id);
  }

  @Delete('read/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all read notifications' })
  @ApiResponse({ status: 200, description: 'Read notifications deleted successfully' })
  async deleteReadNotifications(@CurrentUser() user: User) {
    return this.notificationsService.deleteReadNotifications(user.id);
  }
}
