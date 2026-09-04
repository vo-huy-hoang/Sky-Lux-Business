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

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskChecklistItem)
    private readonly checklistItemRepository: Repository<TaskChecklistItem>,
    private readonly dossiersService: DossiersService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  async findAll(
    user: CurrentUserPayload,
    queryDto: QueryTaskDto,
  ): Promise<PaginatedResponse<Task>> {
    const { page, limit, search, dossierId, assignedTo, status } = queryDto;
    const organizationId = user.organizationId;

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

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(user: CurrentUserPayload, id: string): Promise<Task> {
    const organizationId = user.organizationId;
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

    return task;
  }

  async create(
    user: CurrentUserPayload,
    createTaskDto: CreateTaskDto,
  ): Promise<Task> {
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

    const saved = await this.taskRepository.save(task);

    if (this.notificationsService && saved.assignedTo && saved.assignedTo !== user.id) {
      try {
        await this.notificationsService.notify({
          organizationId: user.organizationId,
          userId: saved.assignedTo,
          title: `Công việc mới được giao: ${saved.title}`,
          content: `${user.fullName || 'Quản lý'} đã giao công việc "${saved.title}" cho bạn.`,
          type: 'TASK',
          linkUrl: '/main/tasks',
          metadata: { taskId: saved.id, dossierId: saved.dossierId },
        });
      } catch (err: any) {
        // Không để lỗi gửi thông báo làm gián đoạn việc lưu công việc
      }
    }

    return saved;
  }

  async update(
    user: CurrentUserPayload,
    id: string,
    updateTaskDto: UpdateTaskDto,
  ): Promise<Task> {
    const task = await this.findOne(user, id);
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

    const saved = await this.taskRepository.save(task);

    if (
      this.notificationsService &&
      saved.assignedTo &&
      saved.assignedTo !== user.id &&
      saved.assignedTo !== previousAssignee
    ) {
      try {
        await this.notificationsService.notify({
          organizationId: user.organizationId,
          userId: saved.assignedTo,
          title: `Công việc được chuyển giao: ${saved.title}`,
          content: `${user.fullName || 'Quản lý'} đã phân công công việc "${saved.title}" cho bạn.`,
          type: 'TASK',
          linkUrl: '/main/tasks',
          metadata: { taskId: saved.id, dossierId: saved.dossierId },
        });
      } catch (err: any) {
        // Không để lỗi gửi thông báo làm gián đoạn việc cập nhật công việc
      }
    }

    return saved;
  }

  async remove(user: CurrentUserPayload, id: string): Promise<void> {
    const task = await this.findOne(user, id);
    await this.taskRepository.softRemove(task);
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
