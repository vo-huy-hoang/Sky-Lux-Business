import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { firstValueFrom } from 'rxjs';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockUser: CurrentUserPayload = {
    id: 'user-uuid-1',
    organizationId: 'org-uuid-1',
    employeeCode: 'EMP001',
    fullName: 'Nguyễn Văn A',
    email: 'a@skylux.com',
    roles: ['OPERATOR'],
    permissions: ['*'],
  };

  const mockNotification: Notification = {
    id: 'notif-uuid-1',
    organizationId: 'org-uuid-1',
    userId: 'user-uuid-1',
    title: 'Hồ sơ đã được gửi duyệt',
    content: 'Sales vừa nộp hồ sơ tour Đà Nẵng',
    type: 'DOSSIER',
    linkUrl: '/main/dossiers/dossier-1',
    isRead: false,
    readAt: undefined,
    metadata: { dossierId: 'dossier-1' },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Notification;

  const mockRepository = {
    create: jest
      .fn()
      .mockImplementation((dto) => ({ ...dto, id: 'notif-uuid-1' })),
    save: jest
      .fn()
      .mockImplementation((item) =>
        Promise.resolve({ ...item, id: item.id || 'notif-uuid-1' }),
      ),
    findOne: jest.fn(),
    count: jest.fn().mockResolvedValue(1),
    remove: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notify', () => {
    it('should save notification and emit created + unread_count events', async () => {
      const events: any[] = [];
      const sub = service.notificationEvent$.subscribe((evt) =>
        events.push(evt),
      );

      const result = await service.notify({
        organizationId: 'org-uuid-1',
        userId: 'user-uuid-1',
        title: 'Hồ sơ mới',
        content: 'Nội dung hồ sơ',
        type: 'DOSSIER',
        linkUrl: '/main/dossiers/1',
      });

      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.title).toBe('Hồ sơ mới');
      expect(events.length).toBe(2);
      expect(events[0].type).toBe('notification.created');
      expect(events[1].type).toBe('notification.unread_count');

      sub.unsubscribe();
    });
  });

  describe('findAll', () => {
    it('should query with user organization and user id', async () => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockNotification], 1]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const res = await service.findAll(mockUser, {
        page: 1,
        limit: 10,
        isRead: false,
        type: 'DOSSIER',
      });

      expect(res.items.length).toBe(1);
      expect(res.total).toBe(1);
      expect(res.totalPages).toBe(1);
      expect(qb.where).toHaveBeenCalledWith(
        'notification.organizationId = :organizationId',
        {
          organizationId: mockUser.organizationId,
        },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'notification.userId = :userId',
        { userId: mockUser.id },
      );
    });
  });

  describe('findOne', () => {
    it('should return notification when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockNotification);

      const res = await service.findOne('notif-uuid-1', mockUser);
      expect(res).toEqual(mockNotification);
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should count unread notifications', async () => {
      mockRepository.count.mockResolvedValue(3);

      const res = await service.getUnreadCount(mockUser);
      expect(res.unreadCount).toBe(3);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: {
          organizationId: mockUser.organizationId,
          userId: mockUser.id,
          isRead: false,
        },
      });
    });
  });

  describe('markAsRead', () => {
    it('should update unread notification to read and emit events', async () => {
      const unreadItem = { ...mockNotification, isRead: false };
      mockRepository.findOne.mockResolvedValue(unreadItem);
      mockRepository.save.mockImplementation((item) => Promise.resolve(item));
      mockRepository.count.mockResolvedValue(0);

      const events: any[] = [];
      const sub = service.notificationEvent$.subscribe((evt) =>
        events.push(evt),
      );

      const res = await service.markAsRead('notif-uuid-1', mockUser);

      expect(res.isRead).toBe(true);
      expect(res.readAt).toBeDefined();
      expect(events.length).toBe(2);
      expect(events[0].type).toBe('notification.read');
      expect(events[1].type).toBe('notification.unread_count');

      sub.unsubscribe();
    });
  });

  describe('markAllAsRead', () => {
    it('should execute bulk update and emit unread_count = 0', async () => {
      const qb: any = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const events: any[] = [];
      const sub = service.notificationEvent$.subscribe((evt) =>
        events.push(evt),
      );

      const res = await service.markAllAsRead(mockUser);

      expect(res.updatedCount).toBe(5);
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('notification.unread_count');
      expect(events[0].data.unreadCount).toBe(0);

      sub.unsubscribe();
    });
  });

  describe('remove', () => {
    it('should remove notification and emit updated count', async () => {
      mockRepository.findOne.mockResolvedValue(mockNotification);
      mockRepository.count.mockResolvedValue(0);

      const events: any[] = [];
      const sub = service.notificationEvent$.subscribe((evt) =>
        events.push(evt),
      );

      await service.remove('notif-uuid-1', mockUser);

      expect(mockRepository.remove).toHaveBeenCalledWith(mockNotification);
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('notification.unread_count');

      sub.unsubscribe();
    });
  });

  describe('getNotificationsStream', () => {
    it('should stream only notifications matching user and organization', async () => {
      const stream$ = service.getNotificationsStream(mockUser);

      // Listen to first emission
      const promise = firstValueFrom(stream$);

      // Emit event for different user (should be ignored)
      service.notificationEvent$.next({
        type: 'notification.created',
        organizationId: mockUser.organizationId,
        userId: 'other-user',
        data: { title: 'Not for you' },
      });

      // Emit event for mockUser
      service.notificationEvent$.next({
        type: 'notification.created',
        organizationId: mockUser.organizationId,
        userId: mockUser.id,
        data: mockNotification,
      });

      const messageEvent = await promise;
      expect((messageEvent.data as any).type).toBe('notification.created');
      expect((messageEvent.data as any).payload).toEqual(mockNotification);
    });
  });
});
