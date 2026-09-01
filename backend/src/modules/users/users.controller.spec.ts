import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    lockUser: jest.fn(),
    unlockUser: jest.fn(),
    remove: jest.fn(),
    assignRoles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll (API-USERS-001)', () => {
    it('should call service.findAll with organizationId and queryDto', async () => {
      const orgId = 'org-uuid';
      const queryDto: QueryUserDto = { page: 1, limit: 20, pageSize: 20 };

      const expectedResult = {
        data: [],
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      };
      mockUsersService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(orgId, queryDto);

      expect(service.findAll).toHaveBeenCalledWith(orgId, queryDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne (API-USERS-002)', () => {
    it('should call service.findOne with organizationId and id', async () => {
      const orgId = 'org-uuid';
      const userId = 'user-uuid';
      const expectedResult = { data: { id: userId } };
      mockUsersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(orgId, userId);

      expect(service.findOne).toHaveBeenCalledWith(orgId, userId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('create (API-USERS-003)', () => {
    it('should call service.create with organizationId and dto', async () => {
      const orgId = 'org-uuid';
      const dto: CreateUserDto = {
        fullName: 'Test User',
        email: 'test@skylux.vn',
      };
      const expectedResult = { data: { id: 'new-id', ...dto } };
      mockUsersService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(orgId, dto);

      expect(service.create).toHaveBeenCalledWith(orgId, dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('update (API-USERS-004)', () => {
    it('should call service.update with organizationId, id, and dto', async () => {
      const orgId = 'org-uuid';
      const userId = 'user-uuid';
      const dto: UpdateUserDto = { fullName: 'Updated Name' };
      const expectedResult = { data: { id: userId, fullName: 'Updated Name' } };
      mockUsersService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(orgId, userId, dto);

      expect(service.update).toHaveBeenCalledWith(orgId, userId, dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('lock (API-USERS-005)', () => {
    it('should call service.lockUser with organizationId and id', async () => {
      const orgId = 'org-uuid';
      const userId = 'user-uuid';
      mockUsersService.lockUser.mockResolvedValue({ message: 'Success' });

      const result = await controller.lock(orgId, userId);

      expect(service.lockUser).toHaveBeenCalledWith(orgId, userId);
      expect(result).toEqual({ message: 'Success' });
    });
  });

  describe('unlock (API-USERS-006)', () => {
    it('should call service.unlockUser with organizationId and id', async () => {
      const orgId = 'org-uuid';
      const userId = 'user-uuid';
      mockUsersService.unlockUser.mockResolvedValue({ message: 'Success' });

      const result = await controller.unlock(orgId, userId);

      expect(service.unlockUser).toHaveBeenCalledWith(orgId, userId);
      expect(result).toEqual({ message: 'Success' });
    });
  });

  describe('remove (API-USERS-007)', () => {
    it('should call service.remove with organizationId and id', async () => {
      const orgId = 'org-uuid';
      const userId = 'user-uuid';
      mockUsersService.remove.mockResolvedValue({
        message: 'Success',
        data: { deleted: true },
      });

      const result = await controller.remove(orgId, userId);

      expect(service.remove).toHaveBeenCalledWith(orgId, userId);
      expect(result).toEqual({ message: 'Success', data: { deleted: true } });
    });
  });

  describe('assignRoles (API-RBAC-006)', () => {
    it('should call service.assignRoles with id, dto, and organizationId', async () => {
      const userId = 'user-uuid';
      const orgId = 'org-uuid';
      const dto: AssignRolesDto = { roleIds: ['role-uuid-1'] };
      mockUsersService.assignRoles.mockResolvedValue({ message: 'Success' });

      const result = await controller.assignRoles(userId, dto, orgId);

      expect(service.assignRoles).toHaveBeenCalledWith(userId, dto, orgId);
      expect(result).toEqual({ message: 'Success' });
    });
  });
});
