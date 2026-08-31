import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dossier } from './entities/dossier.entity';
import { Comment } from './entities/comment.entity';
import { QueryDossierDto } from './dto/query-dossier.dto';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { UpdateDossierDto } from './dto/update-dossier.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QueryCommentDto } from './dto/query-comment.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PaginatedResponse } from '../../common/interfaces/api-response.interface';
import { DossierStatus } from '../../common/enums';
import { toPublicUser } from '../../common/utils/public-user';

@Injectable()
export class DossiersService {
  constructor(
    @InjectRepository(Dossier)
    private readonly dossierRepository: Repository<Dossier>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
  ) {}

  async findAll(
    user: CurrentUserPayload,
    queryDto: QueryDossierDto,
  ): Promise<PaginatedResponse<Dossier>> {
    const { page, limit, search, status, priority } = queryDto;
    const organizationId = user.organizationId;

    const queryBuilder = this.dossierRepository
      .createQueryBuilder('dossier')
      .leftJoinAndSelect('dossier.customer', 'customer')
      .leftJoinAndSelect('dossier.salesUser', 'salesUser')
      .leftJoinAndSelect('dossier.operatorUser', 'operatorUser')
      .where('dossier.organizationId = :organizationId', { organizationId });

    // Enforce own record permission limit if not admin and lacks view all
    const hasViewAll =
      user.permissions.includes('dossier.view.all') ||
      user.permissions.includes('*') ||
      user.roles.includes('SUPER_ADMIN');

    if (!hasViewAll) {
      const visibilityClauses: string[] = [];
      const visibilityParams: Record<string, string> = {};

      if (user.permissions.includes('dossier.view.own')) {
        visibilityClauses.push(
          '(dossier.salesUserId = :userId OR dossier.operatorUserId = :userId OR dossier.createdBy = :userId)',
        );
        visibilityParams.userId = user.id;
      }

      if (user.permissions.includes('dossier.view.team') && user.departmentId) {
        visibilityClauses.push(
          '(salesUser.departmentId = :departmentId OR operatorUser.departmentId = :departmentId)',
        );
        visibilityParams.departmentId = user.departmentId;
      }

      queryBuilder.andWhere(
        visibilityClauses.length > 0 ? `(${visibilityClauses.join(' OR ')})` : '1 = 0',
        visibilityParams,
      );
    }

    if (status) {
      queryBuilder.andWhere('dossier.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('dossier.priority = :priority', { priority });
    }

    if (search) {
      queryBuilder.andWhere(
        '(dossier.code ILIKE :search OR dossier.name ILIKE :search OR dossier.route ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('dossier.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    items.forEach((dossier) => {
      dossier.salesUser = toPublicUser(dossier.salesUser) as typeof dossier.salesUser;
      dossier.operatorUser = toPublicUser(dossier.operatorUser) as typeof dossier.operatorUser;
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(user: CurrentUserPayload, id: string): Promise<Dossier> {
    const organizationId = user.organizationId;
    const dossier = await this.dossierRepository.findOne({
      where: { id, organizationId },
      relations: {
        customer: true,
        businessLine: true,
        marketType: true,
        salesUser: true,
        operatorUser: true,
        passengers: true,
        estimates: true,
      },
    });

    if (!dossier) {
      throw new NotFoundException(`Không tìm thấy hồ sơ với ID "${id}"`);
    }

    const hasViewAll =
      user.permissions.includes('dossier.view.all') ||
      user.permissions.includes('*') ||
      user.roles.includes('SUPER_ADMIN');
    const hasViewTeam = user.permissions.includes('dossier.view.team');
    const isOwnDossier = [
      dossier.salesUserId,
      dossier.operatorUserId,
      dossier.createdBy,
    ].includes(user.id);
    const isTeamDossier =
      !!user.departmentId &&
      [dossier.salesUser?.departmentId, dossier.operatorUser?.departmentId].includes(
        user.departmentId,
      );

    if (
      !hasViewAll &&
      !(
        (user.permissions.includes('dossier.view.own') && isOwnDossier) ||
        (hasViewTeam && isTeamDossier)
      )
    ) {
      throw new NotFoundException(`Không tìm thấy hồ sơ với ID "${id}"`);
    }

    dossier.salesUser = toPublicUser(dossier.salesUser) as typeof dossier.salesUser;
    dossier.operatorUser = toPublicUser(dossier.operatorUser) as typeof dossier.operatorUser;

    return dossier;
  }

  async create(
    user: CurrentUserPayload,
    createDossierDto: CreateDossierDto,
  ): Promise<Dossier> {
    const { code } = createDossierDto;
    const organizationId = user.organizationId;

    const existingCode = await this.dossierRepository.findOne({
      where: { code, organizationId },
    });
    if (existingCode) {
      throw new ConflictException(
        `Mã hồ sơ "${code}" đã tồn tại trong tổ chức của bạn`,
      );
    }

    const dossier = this.dossierRepository.create({
      ...createDossierDto,
      organizationId,
      status: DossierStatus.DRAFT,
      salesUserId: createDossierDto.salesUserId || user.id,
      createdBy: user.id,
    });

    return this.dossierRepository.save(dossier);
  }

  async update(
    user: CurrentUserPayload,
    id: string,
    updateDossierDto: UpdateDossierDto,
  ): Promise<Dossier> {
    const dossier = await this.findOne(user, id);
    if (dossier.status === DossierStatus.LOCKED) {
      throw new BadRequestException('Không thể chỉnh sửa hồ sơ khi đã bị khóa');
    }
    const { code, status, ...updateData } = updateDossierDto;
    const organizationId = user.organizationId;

    if (code && code !== dossier.code) {
      const existingCode = await this.dossierRepository.findOne({
        where: { code, organizationId },
      });
      if (existingCode) {
        throw new ConflictException(`Mã hồ sơ "${code}" đã tồn tại`);
      }
      dossier.code = code;
    }

    if (status && status !== dossier.status) {
      this.validateStatusTransition(dossier.status, status);
      dossier.status = status;
    }

    Object.assign(dossier, updateData);

    return this.dossierRepository.save(dossier);
  }

  async remove(user: CurrentUserPayload, id: string): Promise<void> {
    const dossier = await this.findOne(user, id);
    if (
      dossier.status === DossierStatus.APPROVED ||
      dossier.status === DossierStatus.COMPLETED ||
      dossier.status === DossierStatus.LOCKED
    ) {
      throw new BadRequestException(
        `Không thể xóa hồ sơ khi đang ở trạng thái ${dossier.status}`,
      );
    }
    await this.dossierRepository.softRemove(dossier);
  }

  /**
   * API-COMMENT-001: Lấy danh sách bình luận của hồ sơ tour
   */
  async findComments(
    user: CurrentUserPayload,
    dossierId: string,
    queryDto?: QueryCommentDto,
  ) {
    // 1. Xác thực hồ sơ và quyền truy cập
    await this.findOne(user, dossierId);

    // 2. Truy vấn danh sách bình luận
    const queryBuilder = this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .where('comment.dossierId = :dossierId', { dossierId })
      .andWhere('comment.organizationId = :organizationId', {
        organizationId: user.organizationId,
      })
      .orderBy('comment.createdAt', 'ASC');

    if (queryDto?.search) {
      queryBuilder.andWhere('comment.content ILIKE :search', {
        search: `%${queryDto.search}%`,
      });
    }

    if (queryDto?.page && queryDto?.pageSize) {
      const page = queryDto.page;
      const limit = queryDto.pageSize;
      queryBuilder.skip((page - 1) * limit).take(limit);
      const [comments, total] = await queryBuilder.getManyAndCount();

      const sanitizedComments = comments.map((c) => this.mapComment(c));
      return {
        data: sanitizedComments,
        meta: {
          page,
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    const comments = await queryBuilder.getMany();
    const sanitizedComments = comments.map((c) => this.mapComment(c));

    return {
      data: sanitizedComments,
    };
  }

  /**
   * API-COMMENT-002: Tạo bình luận cho hồ sơ tour
   */
  async createComment(
    user: CurrentUserPayload,
    dossierId: string,
    createCommentDto: CreateCommentDto,
  ) {
    // 1. Xác thực hồ sơ và kiểm tra trạng thái
    const dossier = await this.findOne(user, dossierId);
    if (dossier.status === DossierStatus.LOCKED) {
      throw new BadRequestException(
        'Không thể thêm bình luận khi hồ sơ đã bị khóa',
      );
    }

    const content = createCommentDto.content.trim();
    if (!content) {
      throw new BadRequestException(
        'Nội dung bình luận không được để trống',
      );
    }

    // 2. Kiểm tra parentId nếu có
    if (createCommentDto.parentId) {
      const parentComment = await this.commentRepository.findOne({
        where: {
          id: createCommentDto.parentId,
          dossierId,
          organizationId: user.organizationId,
        },
      });

      if (!parentComment) {
        throw new NotFoundException(
          'Không tìm thấy bình luận gốc (parent comment)',
        );
      }
    }

    // 3. Tạo và lưu entity comment
    const comment = this.commentRepository.create({
      organizationId: user.organizationId,
      dossierId,
      userId: user.id,
      content,
      parentId: createCommentDto.parentId || undefined,
    });

    const savedComment = await this.commentRepository.save(comment);

    // 4. Lấy chi tiết comment kèm thông tin user và ẩn dữ liệu nhạy cảm
    const commentWithUser = await this.commentRepository.findOne({
      where: { id: savedComment.id, organizationId: user.organizationId },
      relations: { user: true },
    });

    const result = this.mapComment(commentWithUser || savedComment);

    return {
      data: result,
    };
  }

  private mapComment(comment: Comment) {
    return {
      id: comment.id,
      organizationId: comment.organizationId,
      dossierId: comment.dossierId,
      userId: comment.userId,
      content: comment.content,
      parentId: comment.parentId ?? null,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      ...(comment.user
        ? {
            user: {
              id: comment.user.id,
              fullName: comment.user.fullName,
              email: comment.user.email,
              avatarUrl: comment.user.avatarUrl,
            },
          }
        : {}),
    };
  }

  private validateStatusTransition(
    current: DossierStatus,
    next: DossierStatus,
  ) {
    if (current === next) {
      return;
    }

    const validTransitions: Record<DossierStatus, DossierStatus[]> = {
      [DossierStatus.DRAFT]: [DossierStatus.SUBMITTED, DossierStatus.CANCELLED],
      [DossierStatus.SUBMITTED]: [
        DossierStatus.IN_REVIEW,
        DossierStatus.CANCELLED,
        DossierStatus.DRAFT,
      ],
      [DossierStatus.IN_REVIEW]: [
        DossierStatus.NEED_CHANGES,
        DossierStatus.APPROVED,
        DossierStatus.CANCELLED,
        DossierStatus.SUBMITTED,
      ],
      [DossierStatus.NEED_CHANGES]: [
        DossierStatus.RESUBMITTED,
        DossierStatus.CANCELLED,
        DossierStatus.DRAFT,
      ],
      [DossierStatus.RESUBMITTED]: [
        DossierStatus.IN_REVIEW,
        DossierStatus.CANCELLED,
      ],
      [DossierStatus.APPROVED]: [
        DossierStatus.COMPLETED,
        DossierStatus.LOCKED,
        DossierStatus.CANCELLED,
      ],
      [DossierStatus.COMPLETED]: [DossierStatus.LOCKED],
      [DossierStatus.LOCKED]: [],
      [DossierStatus.CANCELLED]: [],
    };

    const allowed = validTransitions[current] || [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Không thể chuyển đổi trạng thái hồ sơ từ ${current} sang ${next}`,
      );
    }
  }
}
