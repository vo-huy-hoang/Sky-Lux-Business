import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { QueryMyKpiDto } from './dto/query-my-kpi.dto';
import { QueryKpisDto } from './dto/query-kpis.dto';
import { CreateKpiTargetDto } from './dto/create-kpi-target.dto';
import { UpdateKpiTargetDto } from './dto/update-kpi-target.dto';
import { KpiTarget } from './entities/kpi-target.entity';
import { KpiResult } from './entities/kpi-result.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { User } from '../users/entities/user.entity';
import {
  KpiMetric,
  KpiPeriodType,
  DossierStatus,
  EstimateStatus,
} from '../../common/enums';

interface KpiAccessContext {
  userId: string;
  departmentId?: string;
  roles?: string[];
  permissions?: string[];
}

@Injectable()
export class KpisService {
  constructor(
    @InjectRepository(KpiTarget)
    private readonly targetRepository: Repository<KpiTarget>,
    @InjectRepository(KpiResult)
    private readonly resultRepository: Repository<KpiResult>,
    @InjectRepository(Dossier)
    private readonly dossierRepository: Repository<Dossier>,
    @InjectRepository(Estimate)
    private readonly estimateRepository: Repository<Estimate>,
    @InjectRepository(EstimateRevenueLine)
    private readonly revenueLineRepository: Repository<EstimateRevenueLine>,
    @InjectRepository(EstimateCostLine)
    private readonly costLineRepository: Repository<EstimateCostLine>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findMyKpi(
    organizationId: string,
    userId: string,
    queryDto: QueryMyKpiDto,
  ) {
    const periodType = queryDto.periodType || KpiPeriodType.MONTHLY;
    const { periodStart, periodEnd } = this.resolvePeriodDates(
      periodType,
      queryDto.periodStart,
      queryDto.periodEnd,
      queryDto.date,
    );

    // 1. Fetch all KPI Targets for this period
    const targets = await this.targetRepository.find({
      where: {
        organizationId,
        userId,
        periodType,
        periodStart,
        periodEnd,
      },
    });

    const resultsList: any[] = [];

    // 2. Loop targets and calculate actualValues dynamically
    for (const target of targets) {
      let actualValue = 0;

      switch (target.metricCode) {
        case KpiMetric.REVENUE:
          actualValue = await this.calculateLiveRevenue(
            organizationId,
            userId,
            periodStart,
            periodEnd,
          );
          break;
        case KpiMetric.PROFIT:
          actualValue = await this.calculateLiveProfit(
            organizationId,
            userId,
            periodStart,
            periodEnd,
          );
          break;
        case KpiMetric.DOSSIER_COUNT:
          actualValue = await this.calculateLiveDossierCount(
            organizationId,
            userId,
            periodStart,
            periodEnd,
          );
          break;
        case KpiMetric.CLOSE_RATE:
          actualValue = await this.calculateLiveCloseRate(
            organizationId,
            userId,
            periodStart,
            periodEnd,
          );
          break;
      }

      // Compute achievementRate
      const targetVal = Number(target.targetValue) || 0;
      const achievementRate =
        targetVal > 0
          ? Number(((actualValue / targetVal) * 100).toFixed(2))
          : 0;

      // 3. Upsert KpiResult in DB (Caching)
      let result = await this.resultRepository.findOne({
        where: {
          organizationId,
          userId,
          metricCode: target.metricCode,
          periodType,
          periodStart,
          periodEnd,
        },
      });

      if (!result) {
        result = this.resultRepository.create({
          organizationId,
          userId,
          metricCode: target.metricCode,
          periodType,
          periodStart,
          periodEnd,
        });
      }

      result.actualValue = actualValue;
      result.achievementRate = achievementRate;
      const savedResult = await this.resultRepository.save(result);

      resultsList.push({
        target,
        actualValue: savedResult.actualValue,
        achievementRate: savedResult.achievementRate,
      });
    }

    return {
      data: resultsList.map((item) => ({
        target: this.mapTarget(item.target),
        actualValue: Number(item.actualValue),
        achievementRate: Number(item.achievementRate),
      })),
      meta: {
        page: 1,
        pageSize: resultsList.length,
        total: resultsList.length,
        totalPages: resultsList.length > 0 ? 1 : 0,
      },
    };
  }

  async findAllKpis(
    organizationId: string,
    queryDto: QueryKpisDto,
    access?: KpiAccessContext,
  ) {
    return this.findKpis(organizationId, queryDto, access, false);
  }

  private async findKpis(
    organizationId: string,
    queryDto: QueryKpisDto,
    access: KpiAccessContext | undefined,
    salesOnly: boolean,
  ) {
    const periodType = queryDto.periodType || KpiPeriodType.MONTHLY;
    const { periodStart, periodEnd } = this.resolvePeriodDates(
      periodType,
      queryDto.periodStart,
      queryDto.periodEnd,
    );

    const query = this.targetRepository
      .createQueryBuilder('target')
      .leftJoinAndSelect('target.user', 'user')
      .where('target.organizationId = :organizationId', { organizationId })
      .andWhere('target.periodType = :periodType', { periodType })
      .andWhere('target.periodStart = :periodStart', { periodStart })
      .andWhere('target.periodEnd = :periodEnd', { periodEnd });

    if (salesOnly) {
      query.innerJoin(
        'user.roles',
        'salesRole',
        'salesRole.code = :salesRoleCode',
        { salesRoleCode: 'SALES' },
      );
    }

    const canViewAll =
      access?.roles?.some((role) =>
        ['SUPER_ADMIN', 'CEO_ADMIN'].includes(role),
      ) || access?.permissions?.includes('kpi.view.all');
    const canViewTeam =
      canViewAll || access?.permissions?.includes('kpi.view.team');

    if (queryDto.userId && canViewTeam) {
      query.andWhere('target.userId = :filterUserId', {
        filterUserId: queryDto.userId,
      });
    }

    if (!canViewAll && canViewTeam && access?.departmentId) {
      query.andWhere('user.departmentId = :accessDepartmentId', {
        accessDepartmentId: access.departmentId,
      });
    } else if (!canViewTeam && access?.userId) {
      query.andWhere('target.userId = :accessUserId', {
        accessUserId: access.userId,
      });
    }
    if (queryDto.departmentId) {
      query.andWhere('user.departmentId = :departmentId', {
        departmentId: queryDto.departmentId,
      });
    }

    const page = queryDto.page || 1;
    const pageSize = queryDto.pageSize || 20;
    const skip = (page - 1) * pageSize;

    query.skip(skip).take(pageSize).orderBy('target.createdAt', 'DESC');

    const [items, total] = await query.getManyAndCount();

    // Lấy kèm results tương ứng để return (thực tế nên sync job, nhưng ở đây có thể query theo list items)
    // Tạm thời fetch result list để đính kèm
    const results = await this.resultRepository.find({
      where: {
        organizationId,
        periodType,
        periodStart,
        periodEnd,
      },
    });

    const resultMap = new Map(
      results.map((result) => [
        `${result.userId}:${result.metricCode}`,
        result,
      ]),
    );

    const data = items.map((target) => {
      const result = resultMap.get(`${target.userId}:${target.metricCode}`);
      return {
        target: this.mapTarget(target),
        actualValue: Number(result?.actualValue || 0),
        achievementRate: Number(result?.achievementRate || 0),
      };
    });

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findSalesKpis(
    organizationId: string,
    queryDto: QueryKpisDto,
    access?: KpiAccessContext,
  ) {
    return this.findKpis(organizationId, queryDto, access, true);
  }

  async findAssignableUsers(organizationId: string) {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role', 'role.code = :roleCode', {
        roleCode: 'SALES',
      })
      .where('user.organizationId = :organizationId', { organizationId })
      .andWhere('user.status = :status', { status: 'ACTIVE' })
      .select(['user.id', 'user.fullName', 'user.email', 'user.employeeCode'])
      .orderBy('user.fullName', 'ASC')
      .getMany();

    return {
      data: users,
      meta: { total: users.length },
    };
  }

  async createKpiTarget(
    organizationId: string,
    creatorId: string,
    createDto: CreateKpiTargetDto,
  ) {
    await this.ensureSalesUser(organizationId, createDto.userId);
    this.validatePeriodRange(createDto.periodStart, createDto.periodEnd);

    const existing = await this.targetRepository.findOne({
      where: {
        organizationId,
        userId: createDto.userId,
        metricCode: createDto.metricCode,
        periodType: createDto.periodType,
        periodStart: createDto.periodStart,
        periodEnd: createDto.periodEnd,
      },
    });

    if (existing) {
      throw new ConflictException(
        'KPI target đã tồn tại cho nhân viên này trong kỳ được chọn',
      );
    }

    const newTarget = this.targetRepository.create({
      organizationId,
      createdBy: creatorId,
      ...createDto,
    });

    const saved = await this.targetRepository.save(newTarget);
    return { data: this.mapTarget(saved), meta: {} };
  }

  async updateKpiTarget(
    organizationId: string,
    id: string,
    updateDto: UpdateKpiTargetDto,
  ) {
    const target = await this.targetRepository.findOne({
      where: { id, organizationId },
    });

    if (!target) {
      throw new NotFoundException('Không tìm thấy KPI target');
    }

    const nextTarget = {
      metricCode: updateDto.metricCode ?? target.metricCode,
      periodType: updateDto.periodType ?? target.periodType,
      periodStart: updateDto.periodStart ?? target.periodStart,
      periodEnd: updateDto.periodEnd ?? target.periodEnd,
      userId: updateDto.userId ?? target.userId,
    };

    this.validatePeriodRange(nextTarget.periodStart, nextTarget.periodEnd);
    await this.ensureSalesUser(organizationId, nextTarget.userId);

    const lockedResult = await this.resultRepository.findOne({
      where: {
        organizationId,
        userId: target.userId,
        metricCode: target.metricCode,
        periodType: target.periodType,
        periodStart: target.periodStart,
        periodEnd: target.periodEnd,
        isLocked: true,
      },
    });
    if (lockedResult) {
      throw new ConflictException('KPI đã khóa và không thể cập nhật');
    }

    const duplicate = await this.targetRepository.findOne({
      where: {
        organizationId,
        userId: nextTarget.userId,
        metricCode: nextTarget.metricCode,
        periodType: nextTarget.periodType,
        periodStart: nextTarget.periodStart,
        periodEnd: nextTarget.periodEnd,
        id: Not(id),
      },
    });
    if (duplicate) {
      throw new ConflictException(
        'KPI target đã tồn tại cho nhân viên này trong kỳ được chọn',
      );
    }

    Object.assign(target, updateDto);
    const updated = await this.targetRepository.save(target);

    return { data: this.mapTarget(updated), meta: {} };
  }

  private resolvePeriodDates(
    periodType: KpiPeriodType,
    periodStart?: string,
    periodEnd?: string,
    legacyDate?: string,
  ) {
    if (periodStart && periodEnd) {
      this.validatePeriodRange(periodStart, periodEnd);
      return { periodStart, periodEnd };
    }

    return this.getPeriodDates(periodType, periodStart || legacyDate);
  }

  private getPeriodDates(periodType: KpiPeriodType, dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const year = date.getFullYear();
    const month = date.getMonth();

    let start: Date;
    let end: Date;

    if (periodType === KpiPeriodType.YEARLY) {
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31);
    } else if (periodType === KpiPeriodType.QUARTERLY) {
      const quarter = Math.floor(month / 3);
      start = new Date(year, quarter * 3, 1);
      end = new Date(year, (quarter + 1) * 3, 0);
    } else {
      // MONTHLY
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0);
    }

    const format = (d: Date) => d.toISOString().slice(0, 10);

    return {
      periodStart: format(start),
      periodEnd: format(end),
    };
  }

  private validatePeriodRange(periodStart: string, periodEnd: string) {
    if (
      new Date(`${periodStart}T00:00:00Z`) > new Date(`${periodEnd}T00:00:00Z`)
    ) {
      throw new BadRequestException(
        'periodStart phải nhỏ hơn hoặc bằng periodEnd',
      );
    }
  }

  private async ensureSalesUser(organizationId: string, userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, organizationId },
      relations: { roles: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy nhân viên trong tổ chức');
    }

    if (!user.roles?.some((role) => role.code === 'SALES')) {
      throw new BadRequestException('Chỉ có thể giao KPI cho nhân viên Sales');
    }
  }

  private mapTarget(target: KpiTarget) {
    return {
      id: target.id,
      organizationId: target.organizationId,
      userId: target.userId,
      metricCode: target.metricCode,
      periodType: target.periodType,
      periodStart: target.periodStart,
      periodEnd: target.periodEnd,
      targetValue: Number(target.targetValue),
      createdAt: target.createdAt,
      updatedAt: target.updatedAt,
      user: target.user
        ? {
            id: target.user.id,
            fullName: target.user.fullName,
            email: target.user.email,
            departmentId: target.user.departmentId,
          }
        : undefined,
    };
  }

  private async getApprovedEstimates(
    organizationId: string,
    userId: string,
    start: string,
    end: string,
  ): Promise<Estimate[]> {
    return this.estimateRepository
      .createQueryBuilder('estimate')
      .innerJoin('estimate.dossier', 'dossier')
      .where('dossier.salesUserId = :userId', { userId })
      .andWhere('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('estimate.status = :status', {
        status: EstimateStatus.APPROVED,
      })
      .andWhere('estimate.approvedAt BETWEEN :start AND :end', {
        start: new Date(start + 'T00:00:00Z'),
        end: new Date(end + 'T23:59:59Z'),
      })
      .getMany();
  }

  private async calculateLiveRevenue(
    organizationId: string,
    userId: string,
    start: string,
    end: string,
  ): Promise<number> {
    const approvedEstimates = await this.getApprovedEstimates(
      organizationId,
      userId,
      start,
      end,
    );

    if (approvedEstimates.length === 0) {
      return 0;
    }

    const estimateIds = approvedEstimates.map((e) => e.id);
    const sumResult = await this.revenueLineRepository
      .createQueryBuilder('line')
      .select('SUM(line.netAmount)', 'sum')
      .where('line.estimateId IN (:...estimateIds)', { estimateIds })
      .getRawOne();

    return Number(sumResult?.sum || 0);
  }

  private async calculateLiveProfit(
    organizationId: string,
    userId: string,
    start: string,
    end: string,
  ): Promise<number> {
    const approvedEstimates = await this.getApprovedEstimates(
      organizationId,
      userId,
      start,
      end,
    );

    if (approvedEstimates.length === 0) {
      return 0;
    }

    const estimateIds = approvedEstimates.map((e) => e.id);

    const revenueSumResult = await this.revenueLineRepository
      .createQueryBuilder('line')
      .select('SUM(line.netAmount)', 'sum')
      .where('line.estimateId IN (:...estimateIds)', { estimateIds })
      .getRawOne();

    const costSumResult = await this.costLineRepository
      .createQueryBuilder('line')
      .select('SUM(line.netAmount)', 'sum')
      .where('line.estimateId IN (:...estimateIds)', { estimateIds })
      .getRawOne();

    const revenueSum = Number(revenueSumResult?.sum || 0);
    const costSum = Number(costSumResult?.sum || 0);

    return revenueSum - costSum;
  }

  private async calculateLiveDossierCount(
    organizationId: string,
    userId: string,
    start: string,
    end: string,
  ): Promise<number> {
    return this.dossierRepository
      .createQueryBuilder('dossier')
      .where('dossier.salesUserId = :userId', { userId })
      .andWhere('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('dossier.status IN (:...statuses)', {
        statuses: [
          DossierStatus.APPROVED,
          DossierStatus.COMPLETED,
          DossierStatus.LOCKED,
        ],
      })
      .andWhere('dossier.createdAt BETWEEN :start AND :end', {
        start: new Date(start + 'T00:00:00Z'),
        end: new Date(end + 'T23:59:59Z'),
      })
      .getCount();
  }

  private async calculateLiveCloseRate(
    organizationId: string,
    userId: string,
    start: string,
    end: string,
  ): Promise<number> {
    const totalAssigned = await this.dossierRepository
      .createQueryBuilder('dossier')
      .where('dossier.salesUserId = :userId', { userId })
      .andWhere('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('dossier.createdAt BETWEEN :start AND :end', {
        start: new Date(start + 'T00:00:00Z'),
        end: new Date(end + 'T23:59:59Z'),
      })
      .getCount();

    if (totalAssigned === 0) {
      return 0;
    }

    const wonCount = await this.calculateLiveDossierCount(
      organizationId,
      userId,
      start,
      end,
    );

    return Number(((wonCount / totalAssigned) * 100).toFixed(2));
  }
}
