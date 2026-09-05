import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { TaskChecklistItem } from './entities/task-checklist-item.entity';
import { DossiersService } from '../dossiers/dossiers.service';
import { PaginatedResponse } from '../../common/interfaces/api-response.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { QueryTaskDto } from './dto/query-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from '../../common/enums';
import { RedisService } from '../../common/redis/redis.service';
import { DataSource } from 'typeorm';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let checklistItemRepository: jest.Mocked<Repository<TaskChecklistItem>>;
  let dossiersService: jest.Mocked<DossiersService>;
  let notificationsService: any;
  let redisService: jest.Mocked<RedisService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockUserPayload = {
    id: 'user-uuid',
    organizationId: 'org-uuid',
    permissions: ['task.manage'],
    roles: [],
  } as unknown as CurrentUserPayload;

  const mockTask = {
    id: 'task-uuid',
    title: 'Plan dossier items',
    organizationId: 'org-uuid',
    status: TaskStatus.TODO,
    progressPercent: 0,
    checklistItems: [],
  } as unknown as Task;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockDossiersService = {
    findOne: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    delByPattern: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest
      .fn()
      .mockImplementation((cb) => cb({ save: jest.fn((e) => e) })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
            findOne: jest.fn(),
            create: jest.fn((dto) => dto),
            save: jest.fn(),
            softRemove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TaskChecklistItem),
          useValue: {
            create: jest.fn((dto) => dto),
            delete: jest.fn(),
          },
        },
        {
          provide: DossiersService,
          useValue: mockDossiersService,
        },
        {
          provide: NotificationsService,
          useValue: {
            notify: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepository = module.get(getRepositoryToken(Task));
    checklistItemRepository = module.get(getRepositoryToken(TaskChecklistItem));
    dossiersService = module.get(DossiersService);
    notificationsService = module.get(NotificationsService);
    redisService = module.get(RedisService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated tasks filtered by organizationId', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTask], 1]);

      const result = await service.findAll(mockUserPayload, new QueryTaskDto());

      expect(taskRepository.createQueryBuilder).toHaveBeenCalledWith('task');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'task.organizationId = :organizationId',
        { organizationId: 'org-uuid' },
      );
      expect(result.data).toBeDefined();
      expect(result.data.length).toBe(1);
      expect(result.meta.total).toEqual(1);
    });
  });

  describe('findOne', () => {
    it('should return task if found and authorized', async () => {
      taskRepository.findOne.mockResolvedValue(mockTask);

      const result = await service.findOne(mockUserPayload, 'task-uuid');

      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-uuid', organizationId: 'org-uuid' },
        relations: {
          dossier: true,
          assignee: true,
          checklistItems: true,
        },
        order: {
          checklistItems: { sortOrder: 'ASC' },
        },
      });
      expect(result.data.id).toEqual(mockTask.id);
    });

    it('should throw NotFoundException if not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockUserPayload, 'invalid-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should calculate initial progress from checklist items', async () => {
      dossiersService.findOne.mockResolvedValue({ id: 'dossier-uuid' } as any);
      taskRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      const createDto: CreateTaskDto = {
        title: 'Do visa',
        dossierId: 'dossier-uuid',
        checklistItems: [
          { title: 'Subtask 1', isCompleted: true },
          { title: 'Subtask 2', isCompleted: false },
        ],
      };

      const result = await service.create(mockUserPayload, createDto);

      expect(result.data.progressPercent).toEqual(50);
      expect(result.data.status).toEqual(TaskStatus.IN_PROGRESS);
      expect(redisService.delByPattern).toHaveBeenCalled();
    });

    it('should dispatch notification when task is assigned to another user', async () => {
      dossiersService.findOne.mockResolvedValue({ id: 'dossier-uuid' } as any);
      taskRepository.save.mockImplementation((entity) =>
        Promise.resolve({
          ...entity,
          id: 'task-1',
          assignedTo: 'other-user-uuid',
        } as any),
      );

      const createDto: CreateTaskDto = {
        title: 'Book Flight',
        assignedTo: 'other-user-uuid',
      };

      await service.create(mockUserPayload, createDto);

      expect(notificationsService.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'other-user-uuid',
          type: 'TASK',
          title: expect.stringContaining('Book Flight'),
        }),
      );
    });
  });

  describe('update', () => {
    it('should sync checklist items and automatically complete task if all checked', async () => {
      const activeTask = {
        ...mockTask,
        checklistItems: [{ id: 'item-1', isCompleted: false } as any],
      };

      taskRepository.findOne.mockResolvedValue(activeTask);
      taskRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity as any),
      );

      const updateDto: UpdateTaskDto = {
        checklistItems: [
          { id: 'item-1', title: 'Task updated', isCompleted: true },
          { title: 'Task new', isCompleted: true },
        ],
      };

      const result = await service.update(
        mockUserPayload,
        'task-uuid',
        updateDto,
      );

      expect(result.data.progressPercent).toEqual(100);
      expect(result.data.status).toEqual(TaskStatus.COMPLETED);
      expect(result.data.completedAt).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should find and softRemove task', async () => {
      taskRepository.findOne.mockResolvedValue(mockTask);
      taskRepository.softRemove.mockResolvedValue(mockTask);

      await service.remove(mockUserPayload, 'task-uuid');

      expect(taskRepository.findOne).toHaveBeenCalled();
      expect(taskRepository.softRemove).toHaveBeenCalledWith(mockTask);
    });
  });
});
