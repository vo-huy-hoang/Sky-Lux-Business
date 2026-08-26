import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PermissionsService } from './permissions.service';
import { Permission } from './entities/permission.entity';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let repository: any;

  const mockPermissionRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const mockPermissionRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: getRepositoryToken(Permission),
          useValue: mockPermissionRepository,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    repository = module.get(getRepositoryToken(Permission));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all permissions sorted by module and code', async () => {
      const mockPermissions = [
        { id: '1', code: 'user.create', module: 'USER' },
        { id: '2', code: 'user.view', module: 'USER' },
      ];
      repository.find.mockResolvedValue(mockPermissions);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        order: { module: 'ASC', code: 'ASC' },
      });
      expect(result).toEqual(mockPermissions);
    });
  });
});
