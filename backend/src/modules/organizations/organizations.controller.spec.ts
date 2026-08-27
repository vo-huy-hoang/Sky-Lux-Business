import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateSettingDto } from '../settings/dto/update-setting.dto';

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
});
