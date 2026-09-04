import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { TaskChecklistItem } from './entities/task-checklist-item.entity';
import { QueryTaskDto } from './dto/query-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DossiersService } from '../dossiers/dossiers.service';
import { PaginatedResponse } from '../../common/interfaces/api-response.interface';
import { TaskStatus } from '../../common/enums';
import { TaskActionDto } from './dto/task-action.dto';
import { TaskExtensionRequestDto } from './dto/task-extension-request.dto';
import { RedisService } from '../../common/redis/redis.service';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskChecklistItem)
    private readonly checklistItemRepository: Repository<TaskChecklistItem>,
    private readonly dossiersService: DossiersService,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  async findAll(
    user: CurrentUserPayload,
    queryDto: QueryTaskDto,
  ): Promise<any> {
    const {
      page,
      limit,
      search,
      dossierId,
      assignedTo,
      status,
      priority,
      dueFrom,
      dueTo,
      overdue,
    } = queryDto;
    const organizationId = user.organizationId;

    const queryHash = crypto
      .createHash('md5')
      .update(JSON.stringify(queryDto))
      .digest('hex');
    const cacheKey = `skylux:tasks::api:tasks:org:${organizationId}:user:${user.id}:hash:${queryHash}`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.dossier', 'dossier')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .where('task.organizationId = :organizationId', { organizationId });

    if (dossierId) {
      queryBuilder.andWhere('task.dossierId = :dossierId', { dossierId });
    }

    if (assignedTo) {
      queryBuilder.andWhere('task.assignedTo = :assignedTo', { assignedTo });
    }

    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority });
    }

    if (dueFrom) {
      queryBuilder.andWhere('task.dueAt >= :dueFrom', { dueFrom });
    }

    if (dueTo) {
      queryBuilder.andWhere('task.dueAt <= :dueTo', { dueTo });
    }

    if (overdue) {
      queryBuilder.andWhere(
        'task.dueAt < :now AND task.status != :completedStatus',
        {
          now: new Date(),
          completedStatus: TaskStatus.COMPLETED,
        },
      );
    }

    if (search) {
      queryBuilder.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('task.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    const response = {
      data: items.map((task) => this.toTaskResponseDto(task)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };

    await this.redisService.set(cacheKey, response, 60);

    return response;
  }

  async findOne(user: CurrentUserPayload, id: string): Promise<any> {
    const organizationId = user.organizationId;

    const cacheKey = `skylux:tasks::api:tasks:id:${id}:org:${organizationId}:user:${user.id}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const task = await this.taskRepository.findOne({
      where: { id, organizationId },
      relations: {
        dossier: true,
        assignee: true,
        checklistItems: true,
      },
      order: {
        checklistItems: { sortOrder: 'ASC' },
      },
    });

    if (!task) {
      throw new NotFoundException(`Không tìm thấy công việc với ID "${id}"`);
    }

    const response = {
      data: this.toTaskResponseDto(task),
      meta: {},
    };

    await this.redisService.set(cacheKey, response, 60);

    return response;
  }

  async create(
    user: CurrentUserPayload,
    createTaskDto: CreateTaskDto,
  ): Promise<any> {
    const { dossierId, checklistItems = [], ...dtoData } = createTaskDto;
    const organizationId = user.organizationId;

    if (dossierId) {
      await this.dossiersService.findOne(user, dossierId);
    }

    const processedChecklistItems = checklistItems.map((item) => {
      return this.checklistItemRepository.create({
        ...item,
        isCompleted: item.isCompleted || false,
        completedAt: item.isCompleted ? new Date() : undefined,
      });
    });

    const task = this.taskRepository.create({
      ...dtoData,
      dossierId,
      organizationId,
      status: TaskStatus.TODO,
      createdBy: user.id,
      checklistItems: processedChecklistItems,
    });

    this.recalculateTaskProgress(task);

    const savedTask = await this.taskRepository.save(task);
    if (
      this.notificationsService &&
      savedTask.assignedTo &&
      savedTask.assignedTo !== user.id
    ) {
      try {
        await this.notificationsService.notify({
          organizationId: user.organizationId,
          userId: savedTask.assignedTo,
          title: `Công việc mới được giao: ${savedTask.title}`,
          content: `${user.fullName || 'Quản lý'} đã giao công việc "${savedTask.title}" cho bạn.`,
          type: 'TASK',
          linkUrl: '/main/tasks',
          metadata: { taskId: savedTask.id, dossierId: savedTask.dossierId },
        });
      } catch (err: any) {
        // Không để lỗi gửi thông báo làm gián đoạn việc lưu công việc
      }
    }
    await this.redisService.delByPattern(
      `skylux:tasks::api:tasks:org:${user.organizationId}:*`,
    );
    return {
      data: this.toTaskResponseDto(savedTask),
      meta: {},
    };
  }

  async update(
    user: CurrentUserPayload,
    id: string,
    updateTaskDto: UpdateTaskDto,
  ): Promise<any> {
    const task = await this.taskRepository.findOne({
      where: { id, organizationId: user.organizationId },
      relations: {
        dossier: true,
        assignee: true,
        checklistItems: true,
      },
    });
    if (!task) {
      throw new NotFoundException(`Không tìm thấy công việc với ID "${id}"`);
    }
    const previousAssignee = task.assignedTo;

    const {
      status,
      checklistItems,
      startAt,
      dueAt,
      completedAt,
      ...updateData
    } = updateTaskDto;

    if (startAt !== undefined)
      task.startAt = startAt ? new Date(startAt) : undefined;
    if (dueAt !== undefined) task.dueAt = dueAt ? new Date(dueAt) : undefined;
    if (completedAt !== undefined)
      task.completedAt = completedAt ? new Date(completedAt) : undefined;
    if (status !== undefined) task.status = status;

    Object.assign(task, updateData);

    if (checklistItems) {
      const inputIds = checklistItems
        .map((item) => item.id)
        .filter(Boolean) as string[];
      const existingIds = task.checklistItems.map((item) => item.id);

      // Remove checklist items not in input
      const idsToDelete = existingIds.filter((eid) => !inputIds.includes(eid));
      if (idsToDelete.length > 0) {
        await this.checklistItemRepository.delete(idsToDelete);
      }

      // Update or create checklist items
      task.checklistItems = checklistItems.map((item) => {
        const isCompleted = item.isCompleted || false;
        const compDate = isCompleted ? new Date() : undefined;

        if (item.id) {
          const existing = task.checklistItems.find((ci) => ci.id === item.id);
          return Object.assign(existing || new TaskChecklistItem(), {
            ...item,
            isCompleted,
            completedAt: compDate,
          });
        } else {
          return this.checklistItemRepository.create({
            ...item,
            isCompleted,
            completedAt: compDate,
          });
        }
      });
    }

    this.recalculateTaskProgress(task);

    const savedTask = await this.taskRepository.save(task);
    if (
      this.notificationsService &&
      savedTask.assignedTo &&
      savedTask.assignedTo !== user.id &&
      savedTask.assignedTo !== previousAssignee
    ) {
      try {
        await this.notificationsService.notify({
          organizationId: user.organizationId,
          userId: savedTask.assignedTo,
          title: `Công việc được chuyển giao: ${savedTask.title}`,
          content: `${user.fullName || 'Quản lý'} đã phân công công việc "${savedTask.title}" cho bạn.`,
          type: 'TASK',
          linkUrl: '/main/tasks',
          metadata: { taskId: savedTask.id, dossierId: savedTask.dossierId },
        });
      } catch (err: any) {
        // Không để lỗi gửi thông báo làm gián đoạn việc cập nhật công việc
      }
    }
    await this.redisService.delByPattern(
      `skylux:tasks::api:tasks:org:${user.organizationId}:*`,
    );
    await this.redisService.delByPattern(
      `skylux:tasks::api:tasks:id:${id}:org:${user.organizationId}:*`,
    );
    return {
      data: this.toTaskResponseDto(savedTask),
      meta: {},
    };
  }

  async remove(user: CurrentUserPayload, id: string): Promise<any> {
    const taskData = await this.findOne(user, id);
    const task = await this.taskRepository.findOne({
      where: { id, organizationId: user.organizationId },
    });

    if (task) {
      await this.taskRepository.softRemove(task);

      await this.redisService.delByPattern(
        `skylux:tasks::api:tasks:org:${user.organizationId}:*`,
      );
      await this.redisService.delByPattern(
        `skylux:tasks::api:tasks:id:${id}:org:${user.organizationId}:*`,
      );
    }

    return {
      data: { deleted: true },
      meta: {},
    };
  }

  async startTask(
    user: CurrentUserPayload,
    id: string,
    dto: TaskActionDto,
  ): Promise<any> {
    // We reuse findOne which handles cache and returns { data, meta }
    // But we need the actual entity to update
    const task = await this.taskRepository.findOne({
      where: { id, organizationId: user.organizationId },
      relations: { dossier: true, assignee: true, checklistItems: true },
    });

    if (!task) {
      throw new NotFoundException(`Không tìm thấy công việc với ID "${id}"`);
    }

    task.status = TaskStatus.IN_PROGRESS;
    if (!task.startAt) {
      task.startAt = new Date();
    }

    const savedTask = await this.taskRepository.save(task);

    await this.redisService.delByPattern(
      `skylux:tasks::api:tasks:org:${user.organizationId}:*`,
    );
    await this.redisService.delByPattern(
      `skylux:tasks::api:tasks:id:${id}:org:${user.organizationId}:*`,
    );

    return {
      data: this.toTaskResponseDto(savedTask),
      meta: {},
    };
  }

  async completeTask(
    user: CurrentUserPayload,
    id: string,
    dto: TaskActionDto,
  ): Promise<any> {
    const task = await this.taskRepository.findOne({
      where: { id, organizationId: user.organizationId },
      relations: { dossier: true, assignee: true, checklistItems: true },
    });

    if (!task) {
      throw new NotFoundException(`Không tìm thấy công việc với ID "${id}"`);
    }

    task.status = TaskStatus.COMPLETED;
    task.completedAt = new Date();
    task.progressPercent = 100;

    // Optional: add auditing with dto.comment / dto.reasonCode

    const savedTask = await this.taskRepository.save(task);

    await this.redisService.delByPattern(
      `skylux:tasks::api:tasks:org:${user.organizationId}:*`,
    );
    await this.redisService.delByPattern(
      `skylux:tasks::api:tasks:id:${id}:org:${user.organizationId}:*`,
    );

    return {
      data: this.toTaskResponseDto(savedTask),
      meta: {},
    };
  }

  async requestExtension(
    user: CurrentUserPayload,
    id: string,
    dto: TaskExtensionRequestDto,
  ): Promise<any> {
    const task = await this.taskRepository.findOne({
      where: { id, organizationId: user.organizationId },
      relations: { dossier: true, assignee: true, checklistItems: true },
    });

    if (!task) {
      throw new NotFoundException(`Không tìm thấy công việc với ID "${id}"`);
    }

    if (dto.dueDate) {
      task.dueAt = new Date(dto.dueDate);
    }

    const savedTask = await this.taskRepository.save(task);

    await this.redisService.delByPattern(
      `skylux:tasks::api:tasks:org:${user.organizationId}:*`,
    );
    await this.redisService.delByPattern(
      `skylux:tasks::api:tasks:id:${id}:org:${user.organizationId}:*`,
    );

    return {
      data: this.toTaskResponseDto(savedTask),
      meta: {},
    };
  }

  private toTaskResponseDto(task: Task): any {
    return {
      id: task.id,
      organizationId: task.organizationId,
      dossierId: task.dossierId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      progressPercent: task.progressPercent,
      startAt: task.startAt,
      dueAt: task.dueAt,
      completedAt: task.completedAt,
      assignedTo: task.assignedTo,
      createdBy: task.createdBy,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      assignee: task.assignee
        ? {
            id: task.assignee.id,
            fullName: task.assignee.fullName,
            email: task.assignee.email,
            avatarUrl: task.assignee.avatarUrl,
          }
        : undefined,
      dossier: task.dossier
        ? {
            id: task.dossier.id,
            name: task.dossier.name,
            code: task.dossier.code,
            status: task.dossier.status,
          }
        : undefined,
      checklistItems: task.checklistItems?.map((item) => ({
        id: item.id,
        title: item.title,
        isCompleted: item.isCompleted,
        sortOrder: item.sortOrder,
        completedAt: item.completedAt,
      })),
    };
  }

  private recalculateTaskProgress(task: Task) {
    if (!task.checklistItems || task.checklistItems.length === 0) {
      if (task.status === TaskStatus.COMPLETED && !task.completedAt) {
        task.completedAt = new Date();
        task.progressPercent = 100;
      } else if (task.status === TaskStatus.TODO) {
        task.progressPercent = 0;
      }
      return;
    }

    const total = task.checklistItems.length;
    const completedCount = task.checklistItems.filter(
      (i) => i.isCompleted,
    ).length;
    const progress = Math.round((completedCount / total) * 100);

    task.progressPercent = progress;

    if (progress === 100) {
      task.status = TaskStatus.COMPLETED;
      if (!task.completedAt) {
        task.completedAt = new Date();
      }
    } else if (progress > 0) {
      task.status = TaskStatus.IN_PROGRESS;
      task.completedAt = undefined;
    } else {
      task.status = TaskStatus.TODO;
      task.completedAt = undefined;
    }
  }
}
