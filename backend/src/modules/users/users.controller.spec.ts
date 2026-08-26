import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AssignRolesDto } from './dto/assign-roles.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    lockUser: jest.fn(),
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

  describe('lock', () => {
    it('should call service.lockUser with id', async () => {
      const userId = 'user-uuid';
      mockUsersService.lockUser.mockResolvedValue({ message: 'Success' });

      const result = await controller.lock(userId);

      expect(service.lockUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ message: 'Success' });
    });
  });

  describe('assignRoles', () => {
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
