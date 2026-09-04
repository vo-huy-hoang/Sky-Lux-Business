import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  Sse,
  UseGuards,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtQueryAuthGuard } from '../../common/guards/jwt-query-auth.guard';
import { Notification } from './entities/notification.entity';
import { PaginatedResponse } from '../../common/interfaces/api-response.interface';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('stream')
  @Public()
  @UseGuards(JwtQueryAuthGuard)
  @ApiOperation({
    summary:
      'Mở kết nối Server-Sent Events (SSE) nhận thông báo thời gian thực',
  })
  @ApiResponse({ status: 200, description: 'Luồng dữ liệu EventSource' })
  streamNotifications(
    @CurrentUser() user: CurrentUserPayload,
  ): Observable<MessageEvent> {
    return this.notificationsService.getNotificationsStream(user);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Lấy số lượng thông báo chưa đọc của người dùng' })
  @ApiResponse({ status: 200, description: 'Số lượng thông báo chưa đọc' })
  getUnreadCount(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ unreadCount: number }> {
    return this.notificationsService.getUnreadCount(user);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo có phân trang và bộ lọc' })
  @ApiResponse({ status: 200, description: 'Danh sách thông báo' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryNotificationDto,
  ): Promise<PaginatedResponse<Notification>> {
    return this.notificationsService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một thông báo' })
  @ApiParam({ name: 'id', description: 'ID thông báo (UUID)' })
  @ApiResponse({ status: 200, description: 'Chi tiết thông báo' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<Notification> {
    return this.notificationsService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo thông báo mới thủ công' })
  @ApiResponse({ status: 201, description: 'Tạo thông báo thành công' })
  create(
    @Body() createNotificationDto: CreateNotificationDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<Notification> {
    return this.notificationsService.create(createNotificationDto, user);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo là đã đọc' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  markAllAsRead(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<{ updatedCount: number }> {
    return this.notificationsService.markAllAsRead(user);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu một thông báo là đã đọc' })
  @ApiParam({ name: 'id', description: 'ID thông báo (UUID)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<Notification> {
    return this.notificationsService.markAsRead(id, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa một thông báo' })
  @ApiParam({ name: 'id', description: 'ID thông báo (UUID)' })
  @ApiResponse({ status: 200, description: 'Xóa thông báo thành công' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<void> {
    return this.notificationsService.remove(id, user);
  }
}
