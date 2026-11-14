import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, INestApplication } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateSettingDto } from '../settings/dto/update-setting.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let service: OrganizationsService;

  const mockOrganization = {
    id: 'org-uuid',
    code: 'SKYLUX',
    name: 'Skylux Travel',
    logoUrl: 'logo.png',
    timezone: 'Asia/Ho_Chi_Minh',
    currency: 'VND',
  };

  const mockOrganizationsService = {
    findAll: jest.fn(),
    create: jest.fn(),
    updateOrganization: jest.fn(),
    removeOrganization: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    getSettings: jest.fn(),
    updateSetting: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: OrganizationsService,
          useValue: mockOrganizationsService,
        },
      ],
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
    service = module.get<OrganizationsService>(OrganizationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it("should return the current user's organization profile", async () => {
      mockOrganizationsService.getProfile.mockResolvedValue(mockOrganization);

      const result = await controller.getProfile('org-uuid');

      expect(service.getProfile).toHaveBeenCalledWith('org-uuid');
      expect(result).toEqual(mockOrganization);
    });
  });

  describe('updateProfile', () => {
    it('should call service.updateProfile and return updated organization', async () => {
      const dto: UpdateOrganizationDto = { name: 'New Skylux' };
      const updatedOrg = { ...mockOrganization, name: 'New Skylux' };
      mockOrganizationsService.updateProfile.mockResolvedValue(updatedOrg);

      const result = await controller.updateProfile('org-uuid', dto);

      expect(service.updateProfile).toHaveBeenCalledWith('org-uuid', dto);
      expect(result).toEqual(updatedOrg);
    });
  });

  describe('getSettings', () => {
    it('should call service.getSettings and return settings map', async () => {
      const mockSettings = { MAIL_SENDER: { email: 'test@skylux.vn' } };
      mockOrganizationsService.getSettings.mockResolvedValue(mockSettings);

      const result = await controller.getSettings('org-uuid');

      expect(service.getSettings).toHaveBeenCalledWith('org-uuid');
      expect(result).toEqual(mockSettings);
    });
  });

  describe('updateSetting', () => {
    it('should call service.updateSetting and return updated setting record', async () => {
      const dto: UpdateSettingDto = { value: { email: 'updated@skylux.vn' } };
      const mockSettingResult = { key: 'MAIL_SENDER', value: dto.value };
      mockOrganizationsService.updateSetting.mockResolvedValue(
        mockSettingResult,
      );

      const result = await controller.updateSetting(
        'org-uuid',
        'MAIL_SENDER',
        dto,
      );

      expect(service.updateSetting).toHaveBeenCalledWith(
        'org-uuid',
        'MAIL_SENDER',
        dto.value,
      );
      expect(result).toEqual(mockSettingResult);
    });
  });

  describe('create authorization matrix (Ticket 01)', () => {
    const createPayload = {
      name: 'New Tenant Travel',
      code: 'NEWTENANT',
      slug: 'newtenant',
      contactEmail: 'contact@newtenant.vn',
      phone: '0909123456',
      address: '123 Le Loi, Q1',
      industry: 'Du lịch',
    };

    const createTestAppWithUser = async (user: {
      id: string;
      organizationId: string;
      roles: string[];
      permissions: string[];
    }): Promise<INestApplication> => {
      const moduleRef: TestingModule = await Test.createTestingModule({
        controllers: [OrganizationsController],
        providers: [
          {
            provide: OrganizationsService,
            useValue: mockOrganizationsService,
          },
          Reflector,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) =>
                key === 'app.adminRoles' ? ['SUPER_ADMIN', 'CEO_ADMIN'] : undefined,
              ),
            },
          },
          { provide: APP_GUARD, useClass: RolesGuard },
          { provide: APP_GUARD, useClass: PermissionsGuard },
        ],
      }).compile();

      const app = moduleRef.createNestApplication();
      app.use((req: any, _res: any, next: () => void) => {
        req.user = user;
        next();
      });
      await app.init();
      return app;
    };

    it.each([
      { role: 'SALES', permissions: ['dossier.view.own'] },
      { role: 'OPERATOR', permissions: ['dossier.view.all'] },
      { role: 'CEO_ADMIN', permissions: ['*'] },
    ])(
      'returns 403 Forbidden for non-SUPER_ADMIN role $role on POST /organization',
      async ({ role, permissions }) => {
        const app = await createTestAppWithUser({
          id: 'user-1',
          organizationId: 'org-uuid',
          roles: [role],
          permissions,
        });

        try {
          await request(app.getHttpServer())
            .post('/organization')
            .send(createPayload)
            .expect(403);
          expect(mockOrganizationsService.create).not.toHaveBeenCalled();
        } finally {
          await app.close();
        }
      },
    );

    it('rejects direct controller.create call from non-SUPER_ADMIN with ForbiddenException', () => {
      expect(() =>
        (controller.create as any)(createPayload, ['CEO_ADMIN']),
      ).toThrow(ForbiddenException);
      expect(mockOrganizationsService.create).not.toHaveBeenCalled();
    });

    it('allows SUPER_ADMIN to POST /organization and creates the organization', async () => {
      mockOrganizationsService.create.mockResolvedValue({
        id: 'created-org-id',
        ...createPayload,
      });

      const app = await createTestAppWithUser({
        id: 'super-admin-1',
        organizationId: 'org-uuid',
        roles: ['SUPER_ADMIN'],
        permissions: ['*'],
      });

      try {
        const res = await request(app.getHttpServer())
          .post('/organization')
          .send(createPayload)
          .expect(201);

        expect(res.body).toEqual(
          expect.objectContaining({
            id: 'created-org-id',
            code: 'NEWTENANT',
          }),
        );
        expect(mockOrganizationsService.create).toHaveBeenCalledWith(
          createPayload,
        );
      } finally {
        await app.close();
      }
    });
  });
});
