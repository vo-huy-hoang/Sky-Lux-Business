import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

describe('RolesController', () => {
  let controller: RolesController;
  let service: RolesService;

  const mockRolesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    assignPermissions: jest.fn(),
  };

  beforeEach(async () => {
    const mockRolesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      assignPermissions: jest.fn(),
      assignUserRoles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
    service = module.get<RolesService>(RolesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and organizationId', async () => {
      const dto: CreateRoleDto = { code: 'TEST', name: 'Test' };
      const orgId = 'org-uuid';
      mockRolesService.create.mockResolvedValue({
        id: 'role-uuid',
        ...dto,
        organizationId: orgId,
      });

      const result = await controller.create(dto, orgId);

      expect(service.create).toHaveBeenCalledWith(dto, orgId);
      expect(result).toHaveProperty('id', 'role-uuid');
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with organizationId', async () => {
      const orgId = 'org-uuid';
      mockRolesService.findAll.mockResolvedValue([{ id: '1', code: 'A' }]);

      const result = await controller.findAll(orgId);

      expect(service.findAll).toHaveBeenCalledWith(orgId);
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id and organizationId', async () => {
      const id = 'role-uuid';
      const orgId = 'org-uuid';
      mockRolesService.findOne.mockResolvedValue({ id, code: 'TEST' });

      const result = await controller.findOne(id, orgId);

      expect(service.findOne).toHaveBeenCalledWith(id, orgId);
      expect(result).toHaveProperty('id', id);
    });
  });

  describe('update', () => {
    it('should call service.update with id, dto and organizationId', async () => {
      const id = 'role-uuid';
      const orgId = 'org-uuid';
      const dto: UpdateRoleDto = { name: 'Updated' };
      mockRolesService.update.mockResolvedValue({
        id,
        code: 'TEST',
        name: 'Updated',
      });

      const result = await controller.update(id, dto, orgId);

      expect(service.update).toHaveBeenCalledWith(id, dto, orgId);
      expect(result).toHaveProperty('name', 'Updated');
    });
  });

  describe('remove', () => {
    it('should call service.remove with id, organizationId and force boolean', async () => {
      const id = 'role-uuid';
      const orgId = 'org-uuid';
      mockRolesService.remove.mockResolvedValue({ message: 'Success' });

      const result = await controller.remove(id, orgId, 'true');

      expect(service.remove).toHaveBeenCalledWith(id, orgId, true);
      expect(result).toEqual({ message: 'Success' });
    });

    it('should pass false for force parameter if not provided or different from true string', async () => {
      const id = 'role-uuid';
      const orgId = 'org-uuid';
      mockRolesService.remove.mockResolvedValue({ message: 'Success' });

      await controller.remove(id, orgId, undefined);
      expect(service.remove).toHaveBeenCalledWith(id, orgId, false);

      await controller.remove(id, orgId, 'false');
      expect(service.remove).toHaveBeenCalledWith(id, orgId, false);
    });
  });

  describe('assignPermissions', () => {
    it('should call service.assignPermissions with id, dto, and organizationId', async () => {
      const id = 'role-uuid';
      const orgId = 'org-uuid';
      const dto = {
        permissions: [{ permissionId: 'p1-uuid', scope: 'ALL' as any }],
      };
      mockRolesService.assignPermissions.mockResolvedValue({
        message: 'Success',
      });

      const result = await controller.assignPermissions(id, dto, orgId);

      expect(service.assignPermissions).toHaveBeenCalledWith(id, dto, orgId);
      expect(result).toEqual({ message: 'Success' });
    });
  });
});

