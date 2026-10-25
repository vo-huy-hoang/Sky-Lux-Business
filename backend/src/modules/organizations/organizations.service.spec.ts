import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { OrganizationsService } from './organizations.service';
import { Organization } from './entities/organization.entity';
import { Role } from '../roles/entities/role.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
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
    create: jest.fn((data) => ({ ...data, id: 'new-org-uuid' })),
    find: jest.fn(),
  };

  const mockRoleRepository = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((data) => ({ ...data, id: `role-${data.code}` })),
    save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
  };

  const mockRolePermissionRepository = {
    create: jest.fn((data) => data),
    save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
  };

  const mockEntityManager = {
    getRepository: jest.fn((entity) => {
      if (entity === Organization) return mockOrgRepository;
      if (entity === Role) return mockRoleRepository;
      if (entity === RolePermission) return mockRolePermissionRepository;
      return {};
    }),
  };

  const mockDataSource = {
    transaction: jest.fn(async (callback) => callback(mockEntityManager)),
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
          useValue: mockRoleRepository,
        },
        {
          provide: getRepositoryToken(RolePermission),
          useValue: mockRolePermissionRepository,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
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

  describe('findAll', () => {
    it('should return a list of organizations sorted by name', async () => {
      mockOrgRepository.find.mockResolvedValue([mockOrganization]);

      const result = await service.findAll();

      expect(mockOrgRepository.find).toHaveBeenCalledWith({
        order: { name: 'ASC' },
      });
      expect(result).toEqual([mockOrganization]);
    });
  });

  describe('create', () => {
    const createDto: CreateOrganizationDto = {
      code: 'NEWORG',
      name: 'New Organization',
      slug: 'new-org',
      timezone: 'Asia/Ho_Chi_Minh',
      currency: 'VND',
    };

    it('should atomically create organization, 5 system roles and copy permissions in a transaction', async () => {
      mockOrgRepository.findOne.mockResolvedValue(null);
      mockOrgRepository.save.mockResolvedValue({
        id: 'new-org-uuid',
        ...createDto,
        status: 'ACTIVE',
      });
      mockRoleRepository.find.mockResolvedValue([
        {
          code: 'SUPER_ADMIN',
          name: 'Quản trị tối cao',
          rolePermissions: [{ permissionId: 'perm-1', scope: 'ALL' }],
        },
      ]);

      const result = await service.create(createDto);

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockOrgRepository.findOne).toHaveBeenCalledWith({
        where: [{ code: 'NEWORG' }, { slug: 'new-org' }],
      });
      expect(mockOrgRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'NEWORG',
          slug: 'new-org',
          name: 'New Organization',
          status: 'ACTIVE',
        }),
      );
      expect(mockRoleRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('new-org-uuid');
    });

    it('should throw ConflictException if organization code or slug already exists', async () => {
      mockOrgRepository.findOne.mockResolvedValue({ id: 'existing-id' });

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);

      expect(mockOrgRepository.save).not.toHaveBeenCalled();
      expect(mockRoleRepository.save).not.toHaveBeenCalled();
    });

    it('should abort and rollback transaction if role or permission creation fails', async () => {
      mockOrgRepository.findOne.mockResolvedValue(null);
      mockOrgRepository.save.mockResolvedValue({
        id: 'new-org-uuid',
        ...createDto,
      });
      mockRoleRepository.find.mockResolvedValue([]);
      mockRoleRepository.save.mockRejectedValue(
        new Error('PostgreSQL Unique Constraint Violation on roles'),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        'PostgreSQL Unique Constraint Violation on roles',
      );
    });
  });
});
