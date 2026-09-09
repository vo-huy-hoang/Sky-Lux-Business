import {
  Injectable,
  NotFoundException,
  Optional,
  MessageEvent,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PaginatedResponse } from '../../common/interfaces/api-response.interface';
import { RedisService } from '../../common/redis/redis.service';

export interface SendNotificationPayload {
  organizationId: string;
  userId: string;
  title: string;
  content: string;
  type?: string;
  linkUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationEvent {
  type:
    'notification.created' | 'notification.read' | 'notification.unread_count';
  organizationId: string;
  userId: string;
  data: any;
}

@Injectable()
export class NotificationsService {
  /**
   * RxJS Event Stream cho phân hệ Realtime Notification
   */
  public readonly notificationEvent$ = new Subject<NotificationEvent>();

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @Optional()
    private readonly redisService?: RedisService,
  ) {}

  /**
   * Gửi thông báo tới một người dùng trong tổ chức (Phương thức nghiệp vụ cốt lõi)
   */
  async notify(payload: SendNotificationPayload): Promise<Notification> {
    const notification = this.notificationRepository.create({
      organizationId: payload.organizationId,
      userId: payload.userId,
      title: payload.title.trim(),
      content: payload.content.trim(),
      type: payload.type || 'SYSTEM',
      linkUrl: payload.linkUrl,
      metadata: payload.metadata,
      isRead: false,
    });

    const saved = await this.notificationRepository.save(notification);

    // Phát sự kiện thông báo mới qua SSE
    this.notificationEvent$.next({
      type: 'notification.created',
      organizationId: saved.organizationId,
      userId: saved.userId,
      data: saved,
    });

    // Xóa cache cũ để đảm bảo tính toán số đếm mới chính xác
    if (this.redisService) {
      const cacheKey = `notifications:unread:${saved.organizationId}:${saved.userId}`;
      await this.redisService.del(cacheKey);
    }

    // Cập nhật số lượng chưa đọc realtime
    const unread = await this.getUnreadCount({
      id: saved.userId,
      organizationId: saved.organizationId,
    } as CurrentUserPayload);

    this.notificationEvent$.next({
      type: 'notification.unread_count',
      organizationId: saved.organizationId,
      userId: saved.userId,
      data: unread,
    });

    return saved;
  }

  /**
   * Tạo thông báo từ API REST
   */
  async create(
    createDto: CreateNotificationDto,
    user: CurrentUserPayload,
  ): Promise<Notification> {
    return this.notify({
      organizationId: user.organizationId,
      userId: createDto.userId,
      title: createDto.title,
      content: createDto.content,
      type: createDto.type,
      linkUrl: createDto.linkUrl,
      metadata: createDto.metadata,
    });
  }

  /**
   * Lấy danh sách thông báo có phân trang của người dùng hiện tại
   */
  async findAll(
    user: CurrentUserPayload,
    queryDto: QueryNotificationDto = {},
  ): Promise<PaginatedResponse<Notification>> {
    const page = Math.max(1, queryDto.page || 1);
    const limit = Math.max(1, Math.min(100, queryDto.limit || 20));

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.organizationId = :organizationId', {
        organizationId: user.organizationId,
      })
      .andWhere('notification.userId = :userId', { userId: user.id });

    if (queryDto.isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', {
        isRead: queryDto.isRead,
      });
    }

    if (queryDto.type) {
      queryBuilder.andWhere('notification.type = :type', {
        type: queryDto.type,
      });
    }

    queryBuilder
      .orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data: items,
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Lấy chi tiết một thông báo
   */
  async findOne(id: string, user: CurrentUserPayload): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: {
        id,
        organizationId: user.organizationId,
        userId: user.id,
      },
    });

    if (!notification) {
      throw new NotFoundException(`Không tìm thấy thông báo với ID "${id}"`);
    }

    return notification;
  }

  /**
   * Đếm số lượng thông báo chưa đọc của người dùng
   */
  async getUnreadCount(
    user: CurrentUserPayload,
  ): Promise<{ unreadCount: number }> {
    if (this.redisService) {
      const cacheKey = `notifications:unread:${user.organizationId}:${user.id}`;
      const cached = await this.redisService.get<number>(cacheKey);
      if (cached !== null && cached !== undefined) {
        return { unreadCount: Number(cached) };
      }
    }

    const unreadCount = await this.notificationRepository.count({
      where: {
        organizationId: user.organizationId,
        userId: user.id,
        isRead: false,
      },
    });

    if (this.redisService) {
      const cacheKey = `notifications:unread:${user.organizationId}:${user.id}`;
      await this.redisService.set(cacheKey, unreadCount, 300);
    }

    return { unreadCount };
  }

  /**
   * Đánh dấu một thông báo là đã đọc
   */
  async markAsRead(
    id: string,
    user: CurrentUserPayload,
  ): Promise<Notification> {
    const notification = await this.findOne(id, user);

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);

      if (this.redisService) {
        const cacheKey = `notifications:unread:${user.organizationId}:${user.id}`;
        await this.redisService.del(cacheKey);
      }

      // Phát sự kiện đã đọc
      this.notificationEvent$.next({
        type: 'notification.read',
        organizationId: user.organizationId,
        userId: user.id,
        data: { id: notification.id },
      });

      // Phát số lượng chưa đọc mới
      const unread = await this.getUnreadCount(user);
      this.notificationEvent$.next({
        type: 'notification.unread_count',
        organizationId: user.organizationId,
        userId: user.id,
        data: unread,
      });
    }

    return notification;
  }

  /**
   * Đánh dấu tất cả thông báo của người dùng là đã đọc
   */
  async markAllAsRead(
    user: CurrentUserPayload,
  ): Promise<{ updatedCount: number }> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where(
        'organizationId = :organizationId AND userId = :userId AND isRead = false',
        {
          organizationId: user.organizationId,
          userId: user.id,
        },
      )
      .execute();

    const updatedCount = result.affected || 0;

    if (this.redisService) {
      const cacheKey = `notifications:unread:${user.organizationId}:${user.id}`;
      await this.redisService.set(cacheKey, 0, 300);
    }

    // Phát sự kiện unread_count = 0
    this.notificationEvent$.next({
      type: 'notification.unread_count',
      organizationId: user.organizationId,
      userId: user.id,
      data: { unreadCount: 0 },
    });

    return { updatedCount };
  }

  /**
   * Xóa một thông báo
   */
  async remove(id: string, user: CurrentUserPayload): Promise<void> {
    const notification = await this.findOne(id, user);
    await this.notificationRepository.remove(notification);

    if (!notification.isRead) {
      if (this.redisService) {
        const cacheKey = `notifications:unread:${user.organizationId}:${user.id}`;
        await this.redisService.del(cacheKey);
      }
      const unread = await this.getUnreadCount(user);
      this.notificationEvent$.next({
        type: 'notification.unread_count',
        organizationId: user.organizationId,
        userId: user.id,
        data: unread,
      });
    }
  }

  /**
   * Đăng ký luồng SSE thời gian thực cho một người dùng cụ thể
   */
  getNotificationsStream(user: CurrentUserPayload): Observable<MessageEvent> {
    return this.notificationEvent$.asObservable().pipe(
      filter(
        (evt) =>
          evt.organizationId === user.organizationId && evt.userId === user.id,
      ),
      map((evt) => ({
        data: {
          type: evt.type,
          payload: evt.data,
        },
      })),
    );
  }
}
