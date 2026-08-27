import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dossier } from './entities/dossier.entity';
import { QueryDossierDto } from './dto/query-dossier.dto';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { UpdateDossierDto } from './dto/update-dossier.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PaginatedResponse } from '../../common/interfaces/api-response.interface';
import { DossierStatus } from '../../common/enums';

@Injectable()
export class DossiersService {
  constructor(
    @InjectRepository(Dossier)
    private readonly dossierRepository: Repository<Dossier>,
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
      .where('dossier.organizationId = :organizationId', { organizationId });

    // Enforce own record permission limit if not admin and lacks view all
    const hasViewAll =
      user.permissions.includes('dossier.view.all') ||
      user.permissions.includes('*') ||
      user.roles.includes('SUPER_ADMIN');

    if (!hasViewAll && user.permissions.includes('dossier.view.own')) {
      queryBuilder.andWhere(
        '(dossier.salesUserId = :userId OR dossier.createdBy = :userId)',
        { userId: user.id },
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
        salesUser: true,
        passengers: true,
      },
    });

    if (!dossier) {
      throw new NotFoundException(`Không tìm thấy hồ sơ với ID "${id}"`);
    }

    // Verify own record permissions
    const hasViewAll =
      user.permissions.includes('dossier.view.all') ||
      user.permissions.includes('*') ||
      user.roles.includes('SUPER_ADMIN');

    if (
      !hasViewAll &&
      dossier.salesUserId !== user.id &&
      dossier.createdBy !== user.id
    ) {
      throw new NotFoundException(`Không tìm thấy hồ sơ với ID "${id}"`);
    }

    return dossier;
  }

  async create(
    user: CurrentUserPayload,
    createDossierDto: CreateDossierDto,
  ): Promise<Dossier> {
    const { code } = createDossierDto;
    const organizationId = user.organizationId;

    // Verify system-wide code uniqueness
    const existingCode = await this.dossierRepository.findOne({
      where: { code },
    });
    if (existingCode) {
      throw new ConflictException(
        `Mã hồ sơ "${code}" đã tồn tại trên hệ thống`,
      );
    }

    const dossier = this.dossierRepository.create({
      ...createDossierDto,
      organizationId,
      status: DossierStatus.DRAFT,
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
      throw new BadRequestException(
        'Hồ sơ đã khóa, không thể thay đổi thông tin',
      );
    }
    const { code, status, ...updateData } = updateDossierDto;

    // Check code uniqueness if changing
    if (code && code !== dossier.code) {
      const existingCode = await this.dossierRepository.findOne({
        where: { code },
      });
      if (existingCode) {
        throw new ConflictException(`Mã hồ sơ "${code}" đã tồn tại`);
      }
      dossier.code = code;
    }

    // Validate status state machine transitions
    if (status && status !== dossier.status) {
      this.validateStatusTransition(dossier.status, status);
      dossier.status = status;
    }

    Object.assign(dossier, updateData);
    return this.dossierRepository.save(dossier);
  }

  async remove(user: CurrentUserPayload, id: string): Promise<void> {
    const dossier = await this.findOne(user, id);
    await this.dossierRepository.softRemove(dossier);
  }

  private validateStatusTransition(
    current: DossierStatus,
    next: DossierStatus,
  ) {
    if (current === next) return;

    if (current === DossierStatus.LOCKED) {
      throw new BadRequestException(
        'Hồ sơ đã khóa, không thể thay đổi trạng thái',
      );
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
