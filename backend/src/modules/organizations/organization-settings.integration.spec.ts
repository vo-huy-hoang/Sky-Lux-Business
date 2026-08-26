import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { Organization } from './entities/organization.entity';
import { SettingsService } from '../settings/settings.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateSettingDto } from '../settings/dto/update-setting.dto';

describe('Organization & Settings Module (Integration)', () => {
  let controller: OrganizationsController;
  let orgRepository: jest.Mocked<Repository<Organization>>;
  let settingsService: jest.Mocked<SettingsService>;

  // Shared constants for tests
  const orgIdA = 'org-A-uuid';
  const orgIdB = 'org-B-uuid';
  const mockOrgProfileA = {
    id: orgIdA,
    code: 'SKYLUX',
    name: 'Skylux Travel A',
    logoUrl: 'logoA.png',
    timezone: 'Asia/Ho_Chi_Minh',
    currency: 'VND',
  } as Organization;

  const mockOrgProfileB = {
    id: orgIdB,
    code: 'SKYLUX_B',
    name: 'Skylux Travel B',
    logoUrl: 'logoB.png',
    timezone: 'Asia/Tokyo',
    currency: 'JPY',
  } as Organization;

  // Mock repository and settings service
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
      controllers: [OrganizationsController],
      providers: [
        OrganizationsService,
        {
          provide: getRepositoryToken(Organization),
          useValue: mockOrgRepository,
        },
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
    orgRepository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    ) as jest.Mocked<Repository<Organization>>;
    settingsService = module.get<SettingsService>(
      SettingsService,
    ) as jest.Mocked<SettingsService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Cô lập dữ liệu & Xem thông tin (GET /api/organization)', () => {
    it('Doanh nghiệp A chỉ lấy được thông tin của Doanh nghiệp A', async () => {
      orgRepository.findOne.mockResolvedValue(mockOrgProfileA);

      const result = await controller.getProfile(orgIdA);

      expect(orgRepository.findOne).toHaveBeenCalledWith({
        where: { id: orgIdA },
      });
      expect(result).toEqual(mockOrgProfileA);
    });

    it('Doanh nghiệp B chỉ lấy được thông tin của Doanh nghiệp B', async () => {
      orgRepository.findOne.mockResolvedValue(mockOrgProfileB);

      const result = await controller.getProfile(orgIdB);

      expect(orgRepository.findOne).toHaveBeenCalledWith({
        where: { id: orgIdB },
      });
      expect(result).toEqual(mockOrgProfileB);
    });

    it('Ném lỗi NotFoundException nếu ID tổ chức của người dùng không tồn tại trong DB', async () => {
      orgRepository.findOne.mockResolvedValue(null);

      await expect(controller.getProfile('non-existent-uuid')).rejects.toThrow(
        new NotFoundException(
          'Không tìm thấy tổ chức với ID "non-existent-uuid"',
        ),
      );
    });
  });

  describe('2. Cập nhật thông tin cơ bản (PATCH /api/organization)', () => {
    it('Cập nhật thành công các cấu hình hợp lệ của tổ chức', async () => {
      const updateDto: UpdateOrganizationDto = {
        name: 'New Skylux A',
        currency: 'USD',
      };
      const updatedOrg = { ...mockOrgProfileA, ...updateDto } as Organization;

      orgRepository.findOne.mockResolvedValue(mockOrgProfileA);
      orgRepository.save.mockResolvedValue(updatedOrg);

      const result = await controller.updateProfile(orgIdA, updateDto);

      expect(orgRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Skylux A',
          currency: 'USD',
        }),
      );
      expect(result).toEqual(updatedOrg);
    });
  });

  describe('3. Quản lý cấu hình chi tiết (Settings APIs)', () => {
    it('Doanh nghiệp A chỉ lấy được danh sách cấu hình của Doanh nghiệp A', async () => {
      const mockSettingsA = { MAIL_SENDER: { email: 'senderA@skylux.vn' } };
      orgRepository.findOne.mockResolvedValue(mockOrgProfileA);
      mockSettingsService.getOrganizationSettings.mockResolvedValue(
        mockSettingsA,
      );

      const result = await controller.getSettings(orgIdA);

      expect(orgRepository.findOne).toHaveBeenCalledWith({
        where: { id: orgIdA },
      });
      expect(settingsService.getOrganizationSettings).toHaveBeenCalledWith(
        orgIdA,
      );
      expect(result).toEqual(mockSettingsA);
    });

    it('Cập nhật cấu hình theo key thành công cho đúng doanh nghiệp', async () => {
      const updateSettingDto: UpdateSettingDto = {
        value: { email: 'new@skylux.vn' },
      };
      const mockSettingResult = {
        key: 'MAIL_SENDER',
        value: updateSettingDto.value,
      };

      orgRepository.findOne.mockResolvedValue(mockOrgProfileA);
      mockSettingsService.updateOrganizationSetting.mockResolvedValue(
        mockSettingResult,
      );

      const result = await controller.updateSetting(
        orgIdA,
        'MAIL_SENDER',
        updateSettingDto,
      );

      expect(orgRepository.findOne).toHaveBeenCalledWith({
        where: { id: orgIdA },
      });
      expect(settingsService.updateOrganizationSetting).toHaveBeenCalledWith(
        orgIdA,
        'MAIL_SENDER',
        updateSettingDto.value,
      );
      expect(result).toEqual(mockSettingResult);
    });
  });
});
