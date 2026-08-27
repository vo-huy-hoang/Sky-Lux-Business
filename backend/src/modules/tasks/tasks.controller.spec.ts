import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { QueryTaskDto } from './dto/query-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

describe('TasksController', () => {
  let controller: TasksController;
  let service: TasksService;

  const mockUserPayload = {
    id: 'user-uuid',
    organizationId: 'org-uuid',
    permissions: ['task.manage'],
    roles: [],
  } as unknown as CurrentUserPayload;

  const mockTasksService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call service.findAll and return paginated tasks', async () => {
      const queryDto = new QueryTaskDto();
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      mockTasksService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUserPayload, queryDto);

      expect(service.findAll).toHaveBeenCalledWith(mockUserPayload, queryDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne and return task details', async () => {
      const mockTask = { id: 'task-uuid', title: 'Buy air tickets' };
      mockTasksService.findOne.mockResolvedValue(mockTask);

      const result = await controller.findOne(mockUserPayload, 'task-uuid');

      expect(service.findOne).toHaveBeenCalledWith(
        mockUserPayload,
        'task-uuid',
      );
      expect(result).toEqual(mockTask);
    });
  });

  describe('create', () => {
    it('should call service.create and return created task', async () => {
      const createDto: CreateTaskDto = {
        title: 'Check passports',
        dossierId: 'dossier-uuid',
      };
      const mockTask = { id: 'task-uuid', ...createDto };
      mockTasksService.create.mockResolvedValue(mockTask);

      const result = await controller.create(mockUserPayload, createDto);

      expect(service.create).toHaveBeenCalledWith(mockUserPayload, createDto);
      expect(result).toEqual(mockTask);
    });
  });

  describe('update', () => {
    it('should call service.update and return updated task', async () => {
      const updateDto: UpdateTaskDto = { title: 'Updated Title' };
      const mockTask = { id: 'task-uuid', title: 'Updated Title' };
      mockTasksService.update.mockResolvedValue(mockTask);

      const result = await controller.update(
        mockUserPayload,
        'task-uuid',
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockUserPayload,
        'task-uuid',
        updateDto,
      );
      expect(result).toEqual(mockTask);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockTasksService.remove.mockResolvedValue(undefined);

      await controller.remove(mockUserPayload, 'task-uuid');

      expect(service.remove).toHaveBeenCalledWith(mockUserPayload, 'task-uuid');
    });
  });
});
