import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estimate } from './entities/estimate.entity';
import { EstimateRevenueLine } from './entities/estimate-revenue-line.entity';
import { EstimateCostLine } from './entities/estimate-cost-line.entity';
import { QueryEstimateDto } from './dto/query-estimate.dto';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DossiersService } from '../dossiers/dossiers.service';
import { PaginatedResponse } from '../../common/interfaces/api-response.interface';
import { EstimateStatus } from '../../common/enums';

@Injectable()
export class EstimatesService {
  constructor(
    @InjectRepository(Estimate)
    private readonly estimateRepository: Repository<Estimate>,
    @InjectRepository(EstimateRevenueLine)
    private readonly revenueLineRepository: Repository<EstimateRevenueLine>,
    @InjectRepository(EstimateCostLine)
    private readonly costLineRepository: Repository<EstimateCostLine>,
    private readonly dossiersService: DossiersService,
  ) {}

  async findAll(
    user: CurrentUserPayload,
    queryDto: QueryEstimateDto,
  ): Promise<PaginatedResponse<Estimate>> {
    const { page, limit, search, dossierId, status } = queryDto;
    const organizationId = user.organizationId;

    const queryBuilder = this.estimateRepository
      .createQueryBuilder('estimate')
      .leftJoinAndSelect('estimate.dossier', 'dossier')
      .where('estimate.organizationId = :organizationId', { organizationId });

    if (dossierId) {
      queryBuilder.andWhere('estimate.dossierId = :dossierId', { dossierId });
    }

    if (status) {
      queryBuilder.andWhere('estimate.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(estimate.note ILIKE :search OR estimate.currency ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy('estimate.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    if (items.length > 0) {
      const estimateIds = items.map((e) => e.id);

      const [revenueAgg, costAgg] = await Promise.all([
        this.revenueLineRepository
          .createQueryBuilder('line')
          .select('line.estimateId', 'estimateId')
          .addSelect('COALESCE(SUM(line.netAmount), 0)', 'totalRevenue')
          .where('line.estimateId IN (:...estimateIds)', { estimateIds })
          .groupBy('line.estimateId')
          .getRawMany(),
        this.costLineRepository
          .createQueryBuilder('line')
          .select('line.estimateId', 'estimateId')
          .addSelect('COALESCE(SUM(line.netAmount), 0)', 'totalCost')
          .where('line.estimateId IN (:...estimateIds)', { estimateIds })
          .groupBy('line.estimateId')
          .getRawMany(),
      ]);

      const revMap = new Map(
        revenueAgg.map((r) => [r.estimateId, Number(r.totalRevenue)]),
      );
      const costMap = new Map(
        costAgg.map((c) => [c.estimateId, Number(c.totalCost)]),
      );

      items.forEach((item) => {
        const totalRevenue = revMap.get(item.id) || 0;
        const totalCost = costMap.get(item.id) || 0;
        const totalProfit = totalRevenue - totalCost;
        (item as any).totalRevenue = totalRevenue;
        (item as any).totalCost = totalCost;
        (item as any).totalProfit = totalProfit;
      });
    }

    return {
      data: items,
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(user: CurrentUserPayload, id: string): Promise<Estimate> {
    const organizationId = user.organizationId;
    const estimate = await this.estimateRepository.findOne({
      where: { id, organizationId },
      relations: {
        dossier: true,
        revenueLines: { unit: true, passengerType: true },
        costLines: { unit: true, serviceCategory: true, supplier: true },
      },
      order: {
        revenueLines: { sortOrder: 'ASC' },
        costLines: { sortOrder: 'ASC' },
      },
    });

    if (!estimate) {
      throw new NotFoundException(`Không tìm thấy bản báo giá với ID "${id}"`);
    }

    return estimate;
  }

  async create(
    user: CurrentUserPayload,
    createEstimateDto: CreateEstimateDto,
  ): Promise<Estimate> {
    const {
      dossierId,
      revenueLines = [],
      costLines = [],
      ...dtoData
    } = createEstimateDto;
    const organizationId = user.organizationId;

    // Verify dossier exists and is authorized
    await this.dossiersService.findOne(user, dossierId);

    // Calculate version number
    const count = await this.estimateRepository.count({
      where: { dossierId, organizationId },
    });
    const versionNo = count + 1;

    // Calculate math values for lines and assign organizationId
    const processedRevenueLines = revenueLines.map((line) => {
      const netAmount =
        Number(line.quantity || 1) *
        Number(line.multiplier || 1) *
        Number(line.unitPrice || 0);
      const grossAmount = netAmount * (1 + Number(line.vatRate || 0) / 100);
      return this.revenueLineRepository.create({
        ...line,
        organizationId,
        netAmount,
        grossAmount,
      });
    });

    const processedCostLines = costLines.map((line) => {
      const calculatedNetAmount =
        Number(line.quantity || 1) *
        Number(line.multiplier || 1) *
        Number(line.unitPrice || 0);
      const importedAmount = Number(line.sourceAmount);
      const hasImportedAmount = Number.isFinite(importedAmount);
      const netAmount = hasImportedAmount
        ? importedAmount
        : calculatedNetAmount;
      const grossAmount = hasImportedAmount
        ? importedAmount
        : calculatedNetAmount * (1 + Number(line.vatRate || 0) / 100);
      return this.costLineRepository.create({
        ...line,
        organizationId,
        netAmount,
        grossAmount,
      });
    });

    const estimate = this.estimateRepository.create({
      ...dtoData,
      dossierId,
      organizationId,
      versionNo,
      status: EstimateStatus.DRAFT,
      createdBy: user.id,
      revenueLines: processedRevenueLines,
      costLines: processedCostLines,
    });

    return this.estimateRepository.save(estimate);
  }

  async update(
    user: CurrentUserPayload,
    id: string,
    updateEstimateDto: UpdateEstimateDto,
  ): Promise<Estimate> {
    const estimate = await this.findOne(user, id);
    const organizationId = user.organizationId;

    if (
      estimate.status === EstimateStatus.APPROVED ||
      estimate.status === EstimateStatus.SUPERSEDED
    ) {
      throw new BadRequestException(
        'Bản báo giá đã được duyệt hoặc thay thế, không thể chỉnh sửa thông tin',
      );
    }

    const { status, note, currency, revenueLines, costLines } =
      updateEstimateDto;

    if (status && status !== estimate.status) {
      this.validateStatusTransition(estimate.status, status);
      estimate.status = status;
      if (status === EstimateStatus.APPROVED) {
        estimate.approvedBy = user.id;
        estimate.approvedAt = new Date();
      } else if (status === EstimateStatus.SUBMITTED) {
        estimate.submittedBy = user.id;
        estimate.submittedAt = new Date();
      }
    }

    if (note !== undefined) estimate.note = note;
    if (currency !== undefined) estimate.currency = currency;

    // Sync revenue lines
    if (revenueLines) {
      const inputIds = revenueLines
        .map((l) => l.id)
        .filter(Boolean) as string[];
      const existingIds = estimate.revenueLines.map((l) => l.id);

      // Remove lines not in input
      const idsToDelete = existingIds.filter((eid) => !inputIds.includes(eid));
      if (idsToDelete.length > 0) {
        await this.revenueLineRepository.delete(idsToDelete);
      }

      // Update or create input lines
      estimate.revenueLines = revenueLines.map((line) => {
        const netAmount =
          Number(line.quantity || 1) *
          Number(line.multiplier || 1) *
          Number(line.unitPrice || 0);
        const grossAmount = netAmount * (1 + Number(line.vatRate || 0) / 100);

        if (line.id) {
          const existing = estimate.revenueLines.find(
            (el) => el.id === line.id,
          );
          return Object.assign(existing || new EstimateRevenueLine(), {
            ...line,
            netAmount,
            grossAmount,
          });
        } else {
          return this.revenueLineRepository.create({
            ...line,
            organizationId,
            netAmount,
            grossAmount,
          });
        }
      });
    }

    // Sync cost lines
    if (costLines) {
      const inputIds = costLines.map((l) => l.id).filter(Boolean) as string[];
      const existingIds = estimate.costLines.map((l) => l.id);

      // Remove lines not in input
      const idsToDelete = existingIds.filter((eid) => !inputIds.includes(eid));
      if (idsToDelete.length > 0) {
        await this.costLineRepository.delete(idsToDelete);
      }

      // Update or create input lines
      estimate.costLines = costLines.map((line) => {
        const calculatedNetAmount =
          Number(line.quantity || 1) *
          Number(line.multiplier || 1) *
          Number(line.unitPrice || 0);
        const importedAmount = Number(line.sourceAmount);
        const hasImportedAmount = Number.isFinite(importedAmount);
        const netAmount = hasImportedAmount
          ? importedAmount
          : calculatedNetAmount;
        const grossAmount = hasImportedAmount
          ? importedAmount
          : calculatedNetAmount * (1 + Number(line.vatRate || 0) / 100);

        if (line.id) {
          const existing = estimate.costLines.find((el) => el.id === line.id);
          return Object.assign(existing || new EstimateCostLine(), {
            ...line,
            netAmount,
            grossAmount,
          });
        } else {
          return this.costLineRepository.create({
            ...line,
            organizationId,
            netAmount,
            grossAmount,
          });
        }
      });
    }

    return this.estimateRepository.save(estimate);
  }

  async remove(user: CurrentUserPayload, id: string): Promise<void> {
    const estimate = await this.findOne(user, id);
    await this.estimateRepository.softRemove(estimate);
  }

  private validateStatusTransition(
    current: EstimateStatus,
    next: EstimateStatus,
  ) {
    if (current === next) return;

    const validTransitions: Record<EstimateStatus, EstimateStatus[]> = {
      [EstimateStatus.DRAFT]: [EstimateStatus.SUBMITTED],
      [EstimateStatus.SUBMITTED]: [
        EstimateStatus.IN_REVIEW,
        EstimateStatus.APPROVED,
        EstimateStatus.REJECTED,
        EstimateStatus.DRAFT,
      ],
      [EstimateStatus.IN_REVIEW]: [
        EstimateStatus.APPROVED,
        EstimateStatus.REJECTED,
        EstimateStatus.NEED_CHANGES,
      ],
      [EstimateStatus.NEED_CHANGES]: [
        EstimateStatus.DRAFT,
        EstimateStatus.SUBMITTED,
      ],
      [EstimateStatus.APPROVED]: [EstimateStatus.SUPERSEDED],
      [EstimateStatus.REJECTED]: [EstimateStatus.DRAFT],
      [EstimateStatus.SUPERSEDED]: [],
    };

    const allowed = validTransitions[current] || [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Không thể chuyển đổi trạng thái báo giá từ ${current} sang ${next}`,
      );
    }
  }
}
