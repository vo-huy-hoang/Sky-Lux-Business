import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DataSource } from 'typeorm';
import { of } from 'rxjs';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const mockUser: CurrentUserPayload = {
    id: 'user-uuid-1',
    organizationId: 'org-uuid-1',
    employeeCode: 'EMP001',
    fullName: 'Nguyễn Văn A',
    email: 'a@skylux.com',
    roles: ['OPERATOR'],
    permissions: ['*'],
  };

  const mockService = {
    getNotificationsStream: jest
      .fn()
      .mockReturnValue(of({ data: { type: 'test' } })),
    getUnreadCount: jest.fn().mockResolvedValue({ unreadCount: 2 }),
    findAll: jest.fn().mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    }),
    findOne: jest.fn().mockResolvedValue({ id: 'notif-1', title: 'Thông báo' }),
    create: jest.fn().mockResolvedValue({ id: 'notif-1', title: 'Mới' }),
    markAllAsRead: jest.fn().mockResolvedValue({ updatedCount: 3 }),
    markAsRead: jest.fn().mockResolvedValue({ id: 'notif-1', isRead: true }),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockService,
        },
        {
          provide: JwtService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('streamNotifications should delegate to service', (done) => {
    const stream = controller.streamNotifications(mockUser);
    stream.subscribe((val) => {
      expect(mockService.getNotificationsStream).toHaveBeenCalledWith(mockUser);
      expect(val).toEqual({ data: { type: 'test' } });
      done();
    });
  });

  it('getUnreadCount should return unread count', async () => {
    const res = await controller.getUnreadCount(mockUser);
    expect(res).toEqual({ unreadCount: 2 });
    expect(mockService.getUnreadCount).toHaveBeenCalledWith(mockUser);
  });

  it('findAll should return paginated notifications', async () => {
    const res = await controller.findAll(mockUser, { page: 1, limit: 10 });
    expect(res.meta.total).toBe(0);
    expect(mockService.findAll).toHaveBeenCalledWith(mockUser, {
      page: 1,
      limit: 10,
    });
  });

  it('findOne should return a single notification', async () => {
    const res = await controller.findOne('notif-1', mockUser);
    expect(res.id).toBe('notif-1');
    expect(mockService.findOne).toHaveBeenCalledWith('notif-1', mockUser);
  });

  it('create should call service.create', async () => {
    const dto = { userId: 'user-2', title: 'Test', content: 'Nội dung' };
    const res = await controller.create(dto, mockUser);
    expect(res.title).toBe('Mới');
    expect(mockService.create).toHaveBeenCalledWith(dto, mockUser);
  });

  it('markAllAsRead should call service.markAllAsRead', async () => {
    const res = await controller.markAllAsRead(mockUser);
    expect(res.updatedCount).toBe(3);
    expect(mockService.markAllAsRead).toHaveBeenCalledWith(mockUser);
  });

  it('markAsRead should call service.markAsRead', async () => {
    const res = await controller.markAsRead('notif-1', mockUser);
    expect(res.isRead).toBe(true);
    expect(mockService.markAsRead).toHaveBeenCalledWith('notif-1', mockUser);
  });

  it('remove should call service.remove', async () => {
    await controller.remove('notif-1', mockUser);
    expect(mockService.remove).toHaveBeenCalledWith('notif-1', mockUser);
  });
});
