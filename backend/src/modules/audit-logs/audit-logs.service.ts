import {
  BadRequestException,
  Logger,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { describeAuditAction } from './audit-event.constants';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * API-AUDIT-001: Danh sách audit log phân trang và lọc theo điều kiện
   */
  async findAll(user: CurrentUserPayload, queryDto: QueryAuditLogDto) {
    const {
      actorUserId,
      action,
      entityType,
      entityId,
      requestId,
      from,
      to,
      search,
    } = queryDto;

    const page = queryDto.page ?? 1;
    const limit = Math.min(queryDto.pageSize ?? queryDto.limit ?? 20, 100);
    const organizationId = user.organizationId;
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException('from phải trước hoặc bằng to');
    }

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.actor', 'actor')
      .where('auditLog.organizationId = :organizationId', { organizationId });

    if (actorUserId) {
      queryBuilder.andWhere('auditLog.actorUserId = :actorUserId', {
        actorUserId,
      });
    }

    if (action) {
      queryBuilder.andWhere('auditLog.action ILIKE :action', {
        action: `%${action}%`,
      });
    }

    if (entityType) {
      queryBuilder.andWhere('auditLog.entityType = :entityType', {
        entityType,
      });
    }

    if (entityId) {
      queryBuilder.andWhere('auditLog.entityId = :entityId', { entityId });
    }

    if (requestId) {
      queryBuilder.andWhere('auditLog.requestId = :requestId', { requestId });
    }

    if (fromDate) {
      queryBuilder.andWhere('auditLog.createdAt >= :from', {
        from: fromDate,
      });
    }

    if (toDate) {
      queryBuilder.andWhere('auditLog.createdAt <= :to', {
        to: toDate,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(auditLog.action ILIKE :search OR auditLog.entityType ILIKE :search OR auditLog.requestId ILIKE :search OR auditLog.ipAddress ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('auditLog.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data: items.map((item) => this.mapAuditLog(item)),
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * API-AUDIT-002: Chi tiết audit log theo ID
   */
  async findOne(user: CurrentUserPayload, id: string) {
    const organizationId = user.organizationId;
    const auditLog = await this.auditLogRepository.findOne({
      where: { id, organizationId },
      relations: { actor: true },
    });

    if (!auditLog) {
      throw new NotFoundException(
        `Không tìm thấy nhật ký kiểm toán với ID "${id}"`,
      );
    }

    return {
      data: this.mapAuditLog(auditLog),
    };
  }

  /**
   * Phương thức tiện ích nội bộ để ghi audit log từ các service/interceptor
   */
  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      ...dto,
      description: dto.description ?? describeAuditAction(dto.action),
    });
    return this.auditLogRepository.save(auditLog);
  }

  /**
   * Ghi audit sau khi nghiệp vụ đã thành công. Audit không được làm hỏng
   * response của nghiệp vụ chính nếu storage audit tạm thời gặp lỗi.
   */
  async record(event: {
    organizationId: string;
    actorUserId?: string;
    action: string;
    entityType: string;
    entityId: string;
    beforeData?: Record<string, unknown>;
    afterData?: Record<string, unknown>;
    requestId?: string;
  }): Promise<void> {
    try {
      await this.log(event);
    } catch (error) {
      this.logger.error(
        `Không thể ghi audit ${event.action}/${event.entityType}/${event.entityId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private mapAuditLog(log: AuditLog) {
    return {
      id: log.id,
      organizationId: log.organizationId,
      actorUserId: log.actorUserId,
      action: log.action,
      description: log.description ?? describeAuditAction(log.action),
      entityType: log.entityType,
      entityId: log.entityId,
      beforeData: this.sanitizeAuditData(log.beforeData ?? null),
      afterData: this.sanitizeAuditData(log.afterData ?? null),
      ipAddress: log.ipAddress ?? null,
      userAgent: log.userAgent ?? null,
      requestId: log.requestId ?? null,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
      ...(log.actor
        ? {
            actor: {
              id: log.actor.id,
              fullName: log.actor.fullName,
              email: log.actor.email,
              avatarUrl: log.actor.avatarUrl,
            },
          }
        : {}),
    };
  }

  private sanitizeAuditData(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeAuditData(item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const sensitiveKeyPattern =
      /(password|token|secret|api[_-]?key|private[_-]?key|authorization|credential|signed[_-]?url)/i;

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([key, nestedValue]) => [
          key,
          sensitiveKeyPattern.test(key)
            ? '[REDACTED]'
            : this.sanitizeAuditData(nestedValue),
        ],
      ),
    );
  }
}
