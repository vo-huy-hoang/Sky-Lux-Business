import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import { Estimate } from './entities/estimate.entity';
import { EstimateRevenueLine } from './entities/estimate-revenue-line.entity';
import { EstimateCostLine } from './entities/estimate-cost-line.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { QueryEstimateDto } from './dto/query-estimate.dto';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DossiersService } from '../dossiers/dossiers.service';
import { PaginatedResponse } from '../../common/interfaces/api-response.interface';
import { DossierStatus, EstimateStatus } from '../../common/enums';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit-logs/audit-event.constants';

type CalculableLine = {
  quantity?: number | null;
  multiplier?: number | null;
  unitPrice?: number | null;
  vatRate?: number | null;
};

function numericValue(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function calculateLineNetAmount(line: CalculableLine): number {
  return (
    numericValue(line.quantity, 1) *
    numericValue(line.multiplier, 1) *
    numericValue(line.unitPrice, 0)
  );
}

function calculateLineGrossAmount(line: CalculableLine): number {
  const netAmount = calculateLineNetAmount(line);
  return netAmount * (1 + numericValue(line.vatRate, 0) / 100);
}

function removeSourceAmountNote(note?: string): string | undefined {
  const cleaned = note
    ?.replace(/(?:^|;\s*)Số tiền nguồn:\s*[^;]*/gi, '')
    .replace(/^\s*;\s*|\s*;\s*$/g, '')
    .trim();
  return cleaned || undefined;
}

@Injectable()
export class EstimatesService {
  constructor(
    @InjectRepository(Estimate)
    private readonly estimateRepository: Repository<Estimate>,
    @InjectRepository(EstimateRevenueLine)
    private readonly revenueLineRepository: Repository<EstimateRevenueLine>,
    @InjectRepository(EstimateCostLine)
    private readonly costLineRepository: Repository<EstimateCostLine>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    private readonly dossiersService: DossiersService,
    private readonly auditLogsService: AuditLogsService,
    private readonly dataSource: DataSource,
  ) {}

  private async validateSuppliersOwnership(
    costLines: Array<{ supplierId?: string | null }>,
    organizationId: string,
  ): Promise<void> {
    const supplierIds = Array.from(
      new Set(
        costLines
          .map((l) => l.supplierId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    if (supplierIds.length > 0) {
      const count = await this.supplierRepository.count({
        where: { id: In(supplierIds), organizationId },
      });
      if (count !== supplierIds.length) {
        throw new BadRequestException(
          'Một hoặc nhiều nhà cung cấp không hợp lệ hoặc không thuộc tổ chức của bạn',
        );
      }
    }
  }

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

  async findOne(
    user: CurrentUserPayload,
    id: string,
    logSensitiveView = true,
  ): Promise<Estimate> {
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

    if (logSensitiveView) {
      await this.auditLogsService.record({
        organizationId: user.organizationId,
        actorUserId: user.id,
        action: AuditAction.ESTIMATE_VIEWED,
        entityType: AuditEntityType.ESTIMATE,
        entityId: id,
        afterData: { fields: ['revenueLines', 'costLines', 'supplierCosts'] },
      });
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

    // Verify suppliers belong to organization
    if (costLines.length > 0) {
      await this.validateSuppliersOwnership(costLines, organizationId);
    }

    // Calculate version number
    const count = await this.estimateRepository.count({
      where: { dossierId, organizationId },
    });
    const versionNo = count + 1;

    // Calculate math values for lines and assign organizationId
    const processedRevenueLines = revenueLines.map((line) => {
      const netAmount = calculateLineNetAmount(line);
      const grossAmount = calculateLineGrossAmount(line);
      return this.revenueLineRepository.create({
        ...line,
        organizationId,
        netAmount,
        grossAmount,
      });
    });

    const processedCostLines = costLines.map((line) => {
      const netAmount = calculateLineNetAmount(line);
      const grossAmount = calculateLineGrossAmount(line);
      return this.costLineRepository.create({
        ...line,
        organizationId,
        sourceAmount: line.sourceAmount ?? null,
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

    const savedEstimate = await this.estimateRepository.save(estimate);
    await this.auditLogsService.record({
      organizationId,
      actorUserId: user.id,
      action: AuditAction.ESTIMATE_CREATED,
      entityType: AuditEntityType.ESTIMATE,
      entityId: savedEstimate.id,
      afterData: this.auditSnapshot(savedEstimate),
    });
    return savedEstimate;
  }

  async update(
    user: CurrentUserPayload,
    id: string,
    updateEstimateDto: UpdateEstimateDto,
  ): Promise<Estimate> {
    const estimate = await this.findOne(user, id, false);
    const organizationId = user.organizationId;
    const beforeData = this.auditSnapshot(estimate);
    const previousStatus = estimate.status;
    const previousValue = this.totalRevenue(estimate);

    if (estimate.status === EstimateStatus.SUPERSEDED) {
      throw new BadRequestException(
        'Bản báo giá đã được thay thế, không thể chỉnh sửa thông tin',
      );
    }

    const { status, note, currency, revenueLines, costLines } =
      updateEstimateDto;

    if (costLines && costLines.length > 0) {
      await this.validateSuppliersOwnership(costLines, organizationId);
    }

    const requestedStatus = status ?? estimate.status;
    const wasApproved = estimate.status === EstimateStatus.APPROVED;
    if (
      wasApproved &&
      estimate.dossier?.status !== DossierStatus.APPROVED &&
      estimate.dossier?.status !== DossierStatus.EDITING
    ) {
      throw new BadRequestException(
        'Chỉ có thể sửa dự toán khi hồ sơ đang ở trạng thái Đã duyệt',
      );
    }
    const nextStatus = wasApproved
      ? requestedStatus === EstimateStatus.SUBMITTED
        ? EstimateStatus.SUBMITTED
        : EstimateStatus.EDITING
      : requestedStatus;

    if (nextStatus !== estimate.status) {
      if (!(wasApproved && nextStatus === EstimateStatus.SUBMITTED)) {
        this.validateStatusTransition(estimate.status, nextStatus);
      }
      estimate.status = nextStatus;
      if (nextStatus === EstimateStatus.APPROVED) {
        estimate.approvedBy = user.id;
        estimate.approvedAt = new Date();
      } else if (nextStatus === EstimateStatus.SUBMITTED) {
        estimate.submittedBy = user.id;
        estimate.submittedAt = new Date();
      }
    }

    if (note !== undefined) estimate.note = note;
    if (currency !== undefined) estimate.currency = currency;

    // Wrap line sync and estimate save in an atomic database transaction
    const updatedEstimate = await this.dataSource.transaction(
      async (manager) => {
        const revRepo = manager.getRepository(EstimateRevenueLine);
        const costRepo = manager.getRepository(EstimateCostLine);
        const estRepo = manager.getRepository(Estimate);

        // Sync revenue lines
        if (revenueLines) {
          const inputIds = revenueLines
            .map((l) => l.id)
            .filter(Boolean) as string[];
          const existingIds = estimate.revenueLines.map((l) => l.id);

          // Remove lines not in input
          const idsToDelete = existingIds.filter(
            (eid) => !inputIds.includes(eid),
          );
          if (idsToDelete.length > 0) {
            await revRepo.delete(idsToDelete);
          }

          // Update or create input lines
          estimate.revenueLines = revenueLines.map((line) => {
            const netAmount = calculateLineNetAmount(line);
            const grossAmount = calculateLineGrossAmount(line);

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
              return revRepo.create({
                ...line,
                organizationId,
                estimateId: id,
                netAmount,
                grossAmount,
              });
            }
          });
        }

        // Sync cost lines
        if (costLines) {
          const inputIds = costLines
            .map((l) => l.id)
            .filter(Boolean) as string[];
          const existingIds = estimate.costLines.map((l) => l.id);

          // Remove lines not in input
          const idsToDelete = existingIds.filter(
            (eid) => !inputIds.includes(eid),
          );
          if (idsToDelete.length > 0) {
            await costRepo.delete(idsToDelete);
          }

          // Update or create input lines
          estimate.costLines = costLines.map((line) => {
            const netAmount = calculateLineNetAmount(line);
            const grossAmount = calculateLineGrossAmount(line);

            if (line.id) {
              const existing = estimate.costLines.find(
                (el) => el.id === line.id,
              );
              const sourceAmount =
                line.sourceAmount === null
                  ? null
                  : (line.sourceAmount ?? existing?.sourceAmount ?? null);
              const note =
                sourceAmount === null
                  ? removeSourceAmountNote(line.note ?? existing?.note)
                  : line.note;
              return Object.assign(existing || new EstimateCostLine(), {
                ...line,
                sourceAmount,
                note,
                netAmount,
                grossAmount,
              });
            } else {
              return costRepo.create({
                ...line,
                organizationId,
                estimateId: id,
                sourceAmount: line.sourceAmount ?? null,
                netAmount,
                grossAmount,
              });
            }
          });
        }

        return await estRepo.save(estimate);
      },
    );
    const dossierStatus = estimate.dossier?.status;
    if (wasApproved || dossierStatus === DossierStatus.EDITING) {
      const targetDossierStatus =
        updatedEstimate.status === EstimateStatus.SUBMITTED
          ? DossierStatus.RESUBMITTED
          : DossierStatus.EDITING;
      if (
        dossierStatus === DossierStatus.APPROVED &&
        targetDossierStatus === DossierStatus.RESUBMITTED
      ) {
        await this.dossiersService.update(user, estimate.dossierId, {
          status: DossierStatus.EDITING,
        });
      }
      if (dossierStatus !== targetDossierStatus) {
        await this.dossiersService.update(user, estimate.dossierId, {
          status: targetDossierStatus,
        });
      }
    }
    const afterData = this.auditSnapshot(updatedEstimate);
    await this.auditLogsService.record({
      organizationId,
      actorUserId: user.id,
      action: AuditAction.ESTIMATE_UPDATED,
      entityType: AuditEntityType.ESTIMATE,
      entityId: id,
      beforeData,
      afterData,
    });
    if (previousStatus !== updatedEstimate.status) {
      await this.auditLogsService.record({
        organizationId,
        actorUserId: user.id,
        action: AuditAction.ESTIMATE_STATUS_CHANGED,
        entityType: AuditEntityType.ESTIMATE,
        entityId: id,
        beforeData: { status: previousStatus },
        afterData: { status: updatedEstimate.status },
      });
    }
    const updatedValue = this.totalRevenue(updatedEstimate);
    if (previousValue !== updatedValue) {
      await this.auditLogsService.record({
        organizationId,
        actorUserId: user.id,
        action: AuditAction.ESTIMATE_VALUE_CHANGED,
        entityType: AuditEntityType.ESTIMATE,
        entityId: id,
        beforeData: { totalRevenue: previousValue },
        afterData: { totalRevenue: updatedValue },
      });
    }
    return updatedEstimate;
  }

  async remove(user: CurrentUserPayload, id: string): Promise<void> {
    const estimate = await this.findOne(user, id, false);
    await this.estimateRepository.softRemove(estimate);
    await this.auditLogsService.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: AuditAction.ESTIMATE_DELETED,
      entityType: AuditEntityType.ESTIMATE,
      entityId: id,
      beforeData: this.auditSnapshot(estimate),
    });
  }

  private totalRevenue(estimate: Estimate): number {
    return (estimate.revenueLines ?? []).reduce(
      (total, line) => total + Number(line.netAmount || 0),
      0,
    );
  }

  private auditSnapshot(estimate: Estimate): Record<string, unknown> {
    return {
      dossierId: estimate.dossierId,
      versionNo: estimate.versionNo,
      status: estimate.status,
      currency: estimate.currency,
      totalRevenue: this.totalRevenue(estimate),
      revenueLineCount: estimate.revenueLines?.length ?? 0,
      costLineCount: estimate.costLines?.length ?? 0,
    };
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
      [EstimateStatus.EDITING]: [EstimateStatus.SUBMITTED],
      [EstimateStatus.APPROVED]: [
        EstimateStatus.SUPERSEDED,
        EstimateStatus.EDITING,
      ],
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
