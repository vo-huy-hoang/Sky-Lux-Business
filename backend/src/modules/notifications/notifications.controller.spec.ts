import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, INestApplication } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
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

  it('create should deny non-privileged OPERATOR user with ForbiddenException', () => {
    const dto = { userId: 'user-2', title: 'Test', content: 'Nội dung' };
    expect(() => controller.create(dto, mockUser)).toThrow(ForbiddenException);
    expect(mockService.create).not.toHaveBeenCalled();
  });

  it('create should allow CEO_ADMIN and delegate to service.create', async () => {
    const ceoUser: CurrentUserPayload = {
      ...mockUser,
      roles: ['CEO_ADMIN'],
    };
    const dto = { userId: 'user-2', title: 'Test', content: 'Nội dung' };
    const res = await controller.create(dto, ceoUser);
    expect(res.title).toBe('Mới');
    expect(mockService.create).toHaveBeenCalledWith(dto, ceoUser);
  });

  describe('POST /notifications HTTP role matrix (Ticket 01)', () => {
    const createTestAppWithRoles = async (
      roles: string[],
    ): Promise<INestApplication> => {
      const moduleRef: TestingModule = await Test.createTestingModule({
        controllers: [NotificationsController],
        providers: [
          { provide: NotificationsService, useValue: mockService },
          { provide: JwtService, useValue: {} },
          { provide: ConfigService, useValue: { get: jest.fn() } },
          { provide: DataSource, useValue: {} },
          Reflector,
          { provide: APP_GUARD, useClass: RolesGuard },
        ],
      }).compile();

      const app = moduleRef.createNestApplication();
      app.use((req: any, _res: any, next: () => void) => {
        req.user = {
          ...mockUser,
          roles,
        };
        next();
      });
      await app.init();
      return app;
    };

    it.each(['OPERATOR', 'SALES', 'ACCOUNTANT'])(
      'returns 403 Forbidden for non-privileged role %s on POST /notifications',
      async (role) => {
        const app = await createTestAppWithRoles([role]);
        try {
          await request(app.getHttpServer())
            .post('/notifications')
            .send({ userId: 'user-2', title: 'Fake Alert', content: 'Spoofed' })
            .expect(403);
          expect(mockService.create).not.toHaveBeenCalled();
        } finally {
          await app.close();
        }
      },
    );

    it.each(['CEO_ADMIN', 'SUPER_ADMIN'])(
      'allows %s on POST /notifications',
      async (role) => {
        const app = await createTestAppWithRoles([role]);
        try {
          const res = await request(app.getHttpServer())
            .post('/notifications')
            .send({ userId: 'user-2', title: 'System Notice', content: 'Valid' })
            .expect(201);
          expect(res.body.title).toBe('Mới');
          expect(mockService.create).toHaveBeenCalled();
        } finally {
          await app.close();
        }
      },
    );
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
