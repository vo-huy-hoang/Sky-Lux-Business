import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { OrganizationsService } from './organizations.service';
import { Organization } from './entities/organization.entity';
import { Role } from '../roles/entities/role.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { SettingsService } from '../settings/settings.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let repository: jest.Mocked<Repository<Organization>>;
  let settingsService: SettingsService;

  const mockOrganization = {
    id: 'org-uuid',
    code: 'SKYLUX',
    name: 'Skylux Travel',
    logoUrl: 'logo.png',
    timezone: 'Asia/Ho_Chi_Minh',
    currency: 'VND',
  } as Organization;

  const mockOrgRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockSettingsService = {
    getOrganizationSettings: jest.fn(),
    updateOrganizationSetting: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrgRepository,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            create: jest.fn((data) => data),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RolePermission),
          useValue: {
            create: jest.fn((data) => data),
            save: jest.fn(),
          },
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    repository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    ) as jest.Mocked<Repository<Organization>>;
    settingsService = module.get<SettingsService>(SettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return organization profile if found', async () => {
      repository.findOne.mockResolvedValue(mockOrganization);

      const result = await service.getProfile('org-uuid');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'org-uuid' },
      });
      expect(result).toEqual(mockOrganization);
    });

    it('should throw NotFoundException if organization not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.getProfile('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update and save organization fields', async () => {
      const updateDto: UpdateOrganizationDto = {
        name: 'Updated Name',
        currency: 'USD',
      };
      const updatedOrg = { ...mockOrganization, ...updateDto };

      repository.findOne.mockResolvedValue(mockOrganization);
      repository.save.mockResolvedValue(updatedOrg);

      const result = await service.updateProfile('org-uuid', updateDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'org-uuid' },
      });
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          currency: 'USD',
        }),
      );
      expect(result).toEqual(updatedOrg);
    });
  });

  describe('getSettings', () => {
    it('should throw NotFoundException if organization does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.getSettings('invalid-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should fetch organization settings if organization exists', async () => {
      const mockSettings = { MAIL_SENDER: { email: 'test@skylux.vn' } };
      repository.findOne.mockResolvedValue(mockOrganization);
      mockSettingsService.getOrganizationSettings.mockResolvedValue(
        mockSettings,
      );

      const result = await service.getSettings('org-uuid');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'org-uuid' },
      });
      expect(settingsService.getOrganizationSettings).toHaveBeenCalledWith(
        'org-uuid',
      );
      expect(result).toEqual(mockSettings);
    });
  });

  describe('updateSetting', () => {
    it('should throw NotFoundException if organization does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.updateSetting('invalid-uuid', 'KEY', 'VALUE'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update organization setting if organization exists', async () => {
      repository.findOne.mockResolvedValue(mockOrganization);
      const mockSettingResult = { key: 'KEY', value: 'VALUE' };
      mockSettingsService.updateOrganizationSetting.mockResolvedValue(
        mockSettingResult,
      );

      const result = await service.updateSetting('org-uuid', 'KEY', 'VALUE');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'org-uuid' },
      });
      expect(settingsService.updateOrganizationSetting).toHaveBeenCalledWith(
        'org-uuid',
        'KEY',
        'VALUE',
      );
      expect(result).toEqual(mockSettingResult);
    });
  });
});
