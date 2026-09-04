import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { TaskChecklistItem } from './entities/task-checklist-item.entity';
import { DossiersService } from '../dossiers/dossiers.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from '../../common/enums';
import { RedisService } from '../../common/redis/redis.service';
import { DataSource } from 'typeorm';

describe('Tasks Module (Integration)', () => {
  let controller: TasksController;
  let taskRepository: jest.Mocked<Repository<Task>>;

  const orgA = 'org-A-uuid';
  const orgB = 'org-B-uuid';

  const mockUserOrgA = {
    id: 'user-A-uuid',
    organizationId: orgA,
    permissions: ['task.manage'],
    roles: [],
  } as unknown as CurrentUserPayload;

  const mockTaskOrgB = {
    id: 'task-B-uuid',
    title: 'Task of Org B',
    organizationId: orgB,
    status: TaskStatus.TODO,
    checklistItems: [],
  } as unknown as Task;

  const mockTaskOrgA = {
    id: 'task-A-uuid',
    title: 'Task of Org A',
    organizationId: orgA,
    status: TaskStatus.TODO,
    checklistItems: [],
  } as unknown as Task;

  const mockDossiersService = {
    findOne: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    delByPattern: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn().mockImplementation((cb) => cb({ save: jest.fn((e) => e) })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            createQueryBuilder: jest.fn(),
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
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    taskRepository = module.get(getRepositoryToken(Task));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Cô lập dữ liệu đa doanh nghiệp (Multi-tenancy isolation)', () => {
    it('Doanh nghiệp A KHÔNG THỂ xem công việc của Doanh nghiệp B (Trả về 404)', async () => {
      taskRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'task-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockTaskOrgB);
      });

      await expect(
        controller.findOne(mockUserOrgA, 'task-B-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('Doanh nghiệp A KHÔNG THỂ chỉnh sửa công việc của Doanh nghiệp B (Trả về 404)', async () => {
      taskRepository.findOne.mockImplementation(({ where }: any) => {
        if (where.id === 'task-B-uuid' && where.organizationId === orgA) {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockTaskOrgB);
      });

      const updateDto: UpdateTaskDto = { title: 'Hacked title' };

      await expect(
        controller.update(mockUserOrgA, 'task-B-uuid', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
