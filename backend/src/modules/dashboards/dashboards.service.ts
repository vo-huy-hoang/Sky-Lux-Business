import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
export type {
  SupplierSpendSummaryDto,
  SupplierSpendItemDto,
} from './dto/supplier-spend-summary.dto';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { Task } from '../tasks/entities/task.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { KpiResult } from '../kpis/entities/kpi-result.entity';
import { User } from '../users/entities/user.entity';
import { RedisService } from '../../common/redis/redis.service';
import {
  DossierStatus,
  EstimateStatus,
  TaskStatus,
  KpiPeriodType,
} from '../../common/enums';
import {
  DEFAULT_BUSINESS_TIMEZONE,
  resolvePeriodRange,
} from '../../common/utils/period-range.util';
import {
  FinancialReadModelService,
  SupplierSpendSummary,
} from '../financials/financial-read-model.service';
import {
  LATEST_APPROVED_ESTIMATE_SUBQUERY,
  VALUED_COST_NET_SQL,
  VALUED_REVENUE_NET_SQL,
  zonedMonthKeySql,
} from '../financials/financial-read-model.sql';

@Injectable()
export class DashboardsService {
  constructor(
    @InjectRepository(Dossier)
    private readonly dossierRepository: Repository<Dossier>,
    @InjectRepository(Estimate)
    private readonly estimateRepository: Repository<Estimate>,
    @InjectRepository(EstimateRevenueLine)
    private readonly revenueLineRepository: Repository<EstimateRevenueLine>,
    @InjectRepository(EstimateCostLine)
    private readonly costLineRepository: Repository<EstimateCostLine>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(KpiResult)
    private readonly kpiResultRepository: Repository<KpiResult>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly financialReadModel: FinancialReadModelService,
    @Optional()
    private readonly redisService?: RedisService,
  ) {}

  private formatSupplierSpendResponse(summary: SupplierSpendSummary) {
    const items = summary.topSuppliers;
    return {
      supplierBreakdown: items,
      supplierSpendSummary: {
        items,
        totalSpend: summary.totalSupplierSpend,
        otherSuppliersSpend: summary.otherSuppliersSpend,
        otherSuppliersCount: summary.otherSuppliersCount,
        totalSupplierCount: summary.totalSuppliersCount,
      },
      totalSupplierSpend: summary.totalSupplierSpend,
      otherSuppliersSpend: summary.otherSuppliersSpend,
      otherSuppliersCount: summary.otherSuppliersCount,
      totalSupplierCount: summary.totalSuppliersCount,
    };
  }

  async getSalesDashboard(
    organizationId: string,
    userId: string,
    queryDto: QueryDashboardDto,
  ) {
    const periodType = queryDto.periodType || KpiPeriodType.MONTHLY;
    const { startUtc, endUtc } = resolvePeriodRange(periodType, queryDto.date);

    const cacheKey = `dashboard:sales:v2:${organizationId}:${userId}:${periodType}:${queryDto.date || 'current'}`;

    const compute = async () => {
      const [estimateIds, dossiersBreakdown, tasksBreakdown] =
        await Promise.all([
          this.financialReadModel.getLatestApprovedEstimateIds({
            organizationId,
            salesUserId: userId,
            startUtc,
            endUtc,
          }),
          this.dossierRepository
            .createQueryBuilder('dossier')
            .select('dossier.status', 'status')
            .addSelect('COUNT(dossier.id)', 'count')
            .where('dossier.salesUserId = :userId', { userId })
            .andWhere('dossier.organizationId = :organizationId', {
              organizationId,
            })
            .andWhere('dossier.createdAt BETWEEN :start AND :end', {
              start: startUtc,
              end: endUtc,
            })
            .groupBy('dossier.status')
            .getRawMany(),
          this.taskRepository
            .createQueryBuilder('task')
            .select('task.status', 'status')
            .addSelect('COUNT(task.id)', 'count')
            .where('task.assignedTo = :userId', { userId })
            .andWhere('task.organizationId = :organizationId', {
              organizationId,
            })
            .groupBy('task.status')
            .getRawMany(),
        ]);

      const totals = await this.financialReadModel.getValuedTotalsForEstimates(
        organizationId,
        estimateIds,
      );

      return {
        revenue: totals.revenueNet,
        profit: totals.profit,
        dossiersBreakdown: dossiersBreakdown.map((d) => ({
          status: d.status,
          count: Number(d.count),
        })),
        tasksBreakdown: tasksBreakdown.map((t) => ({
          status: t.status,
          count: Number(t.count),
        })),
      };
    };

    if (!this.redisService) return compute();
    return this.redisService.getOrCompute(cacheKey, compute, 60);
  }

  async getOperatorDashboard(
    organizationId: string,
    queryDto: QueryDashboardDto,
  ) {
    const periodType = queryDto.periodType || KpiPeriodType.MONTHLY;
    const { startUtc, endUtc } = resolvePeriodRange(periodType, queryDto.date);

    const cacheKey = `dashboard:operator:v6:${organizationId}:${periodType}:${queryDto.date || 'current'}`;

    const compute = async () => {
      const now = new Date();
      const [
        activeDossiersCount,
        priorityBreakdown,
        overdueTasksCount,
        tasksBreakdown,
        totalSuppliers,
        revenueBreakdown,
        supplierSpendSummary,
        businessLineBreakdown,
        totalDossiersCount,
        pendingApprovalsCount,
        approvedEstimateIds,
      ] = await Promise.all([
        this.dossierRepository.count({
          where: {
            organizationId,
            status: Not(
              In([
                DossierStatus.COMPLETED,
                DossierStatus.CANCELLED,
                DossierStatus.LOCKED,
              ]),
            ),
          },
        }),
        this.dossierRepository
          .createQueryBuilder('dossier')
          .select('dossier.priority', 'priority')
          .addSelect('COUNT(dossier.id)', 'count')
          .where('dossier.organizationId = :organizationId', { organizationId })
          .andWhere('dossier.status NOT IN (:...closedStatuses)', {
            closedStatuses: [
              DossierStatus.COMPLETED,
              DossierStatus.CANCELLED,
              DossierStatus.LOCKED,
            ],
          })
          .groupBy('dossier.priority')
          .getRawMany(),
        this.taskRepository
          .createQueryBuilder('task')
          .where('task.organizationId = :organizationId', { organizationId })
          .andWhere('task.status NOT IN (:...closedTaskStatuses)', {
            closedTaskStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
          })
          .andWhere('task.dueAt < :now', { now })
          .getCount(),
        this.taskRepository
          .createQueryBuilder('task')
          .select('task.status', 'status')
          .addSelect('COUNT(task.id)', 'count')
          .where('task.organizationId = :organizationId', { organizationId })
          .groupBy('task.status')
          .getRawMany(),
        this.supplierRepository.count({
          where: { organizationId },
        }),
        this.revenueLineRepository
          .createQueryBuilder('line')
          .select(
            "COALESCE(NULLIF(dossier.market_type_name, ''), 'Chưa phân loại')",
            'marketTypeName',
          )
          .addSelect(
            `COALESCE(SUM(${VALUED_REVENUE_NET_SQL('line')}), 0)`,
            'amount',
          )
          .innerJoin('line.estimate', 'estimate')
          .innerJoin('estimate.dossier', 'dossier')
          .where('dossier.organizationId = :organizationId', { organizationId })
          .andWhere('line.organizationId = :organizationId', { organizationId })
          .andWhere('estimate.status = :approvedEstimateStatus', {
            approvedEstimateStatus: EstimateStatus.APPROVED,
          })
          .andWhere(`estimate.id = ${LATEST_APPROVED_ESTIMATE_SUBQUERY}`, {
            organizationId,
            approvedEstimateStatus: EstimateStatus.APPROVED,
          })
          .andWhere('estimate.approvedAt BETWEEN :start AND :end', {
            start: startUtc,
            end: endUtc,
          })
          .groupBy(
            "COALESCE(NULLIF(dossier.market_type_name, ''), 'Chưa phân loại')",
          )
          .orderBy('amount', 'DESC')
          .getRawMany(),
        this.financialReadModel.getSupplierSpendSummary({
          organizationId,
          startUtc,
          endUtc,
          topLimit: 6,
        }),
        this.revenueLineRepository
          .createQueryBuilder('line')
          .select(
            "COALESCE(NULLIF(dossier.business_line_name, ''), 'Chưa phân loại')",
            'businessLineName',
          )
          .addSelect(
            `COALESCE(SUM(${VALUED_REVENUE_NET_SQL('line')}), 0)`,
            'amount',
          )
          .innerJoin('line.estimate', 'estimate')
          .innerJoin('estimate.dossier', 'dossier')
          .where('dossier.organizationId = :organizationId', { organizationId })
          .andWhere('line.organizationId = :organizationId', { organizationId })
          .andWhere('estimate.status = :approvedEstimateStatus', {
            approvedEstimateStatus: EstimateStatus.APPROVED,
          })
          .andWhere(`estimate.id = ${LATEST_APPROVED_ESTIMATE_SUBQUERY}`, {
            organizationId,
            approvedEstimateStatus: EstimateStatus.APPROVED,
          })
          .andWhere('estimate.approvedAt BETWEEN :start AND :end', {
            start: startUtc,
            end: endUtc,
          })
          .groupBy(
            "COALESCE(NULLIF(dossier.business_line_name, ''), 'Chưa phân loại')",
          )
          .orderBy('amount', 'DESC')
          .getRawMany(),
        this.dossierRepository.count({ where: { organizationId } }),
        this.dossierRepository.count({
          where: {
            organizationId,
            status: In([DossierStatus.SUBMITTED, DossierStatus.IN_REVIEW]),
          },
        }),
        this.financialReadModel.getLatestApprovedEstimateIds({
          organizationId,
          startUtc,
          endUtc,
        }),
      ]);

      const totals = await this.financialReadModel.getValuedTotalsForEstimates(
        organizationId,
        approvedEstimateIds,
      );

      return {
        activeDossiersCount,
        priorityBreakdown: priorityBreakdown.map((p) => ({
          priority: p.priority,
          count: Number(p.count),
        })),
        overdueTasksCount,
        tasksBreakdown: tasksBreakdown.map((t) => ({
          status: t.status,
          count: Number(t.count),
        })),
        totalSuppliers,
        totalDossiersCount,
        pendingApprovalsCount,
        totalProfit: totals.profit,
        revenueBreakdown: revenueBreakdown.map((row) => ({
          marketTypeName: row.marketTypeName,
          amount: Math.round(Number(row.amount || 0)),
        })),
        businessLineBreakdown: businessLineBreakdown.map((row) => ({
          businessLineName: row.businessLineName,
          amount: Math.round(Number(row.amount || 0)),
        })),
        ...this.formatSupplierSpendResponse(supplierSpendSummary),
      };
    };

    if (!this.redisService) return compute();
    return this.redisService.getOrCompute(cacheKey, compute, 60);
  }

  async getOperatorSalesSummary(organizationId: string) {
    const cacheKey = `dashboard:operator:sales-summary:v3:${organizationId}`;

    const compute = async () => {
      const [dossiers, salesFinancials] = await Promise.all([
        this.userRepository
          .createQueryBuilder('user')
          .innerJoin('user.roles', 'role')
          .leftJoin(
            Dossier,
            'dossier',
            'dossier.salesUserId = user.id AND dossier.organizationId = :organizationId',
            { organizationId },
          )
          .select('user.id', 'salesUserId')
          .addSelect('user.fullName', 'salesUserName')
          .addSelect('user.email', 'salesUserEmail')
          .addSelect('user.employeeCode', 'employeeCode')
          .addSelect('COUNT(dossier.id)', 'totalDossiers')
          .addSelect(
            `COUNT(CASE WHEN dossier.status IN ('APPROVED', 'COMPLETED') THEN 1 END)`,
            'approvedDossiers',
          )
          .addSelect(
            `COUNT(CASE WHEN dossier.status = 'COMPLETED' THEN 1 END)`,
            'completedDossiers',
          )
          .where('user.organizationId = :organizationId', { organizationId })
          .andWhere('role.code = :salesRole', { salesRole: 'SALES' })
          .andWhere('role.organizationId = :organizationId', { organizationId })
          .groupBy('user.id')
          .addGroupBy('user.fullName')
          .addGroupBy('user.email')
          .addGroupBy('user.employeeCode')
          .getRawMany(),
        this.financialReadModel.getSalesFinancialPerformance(organizationId),
      ]);

      return dossiers
        .map((d) => {
          const total = Number(d.totalDossiers || 0);
          const approved = Number(d.approvedDossiers || 0);
          const completed = Number(d.completedDossiers || 0);
          const fin = salesFinancials.get(d.salesUserId) ?? {
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
          };
          return {
            salesUserId: d.salesUserId,
            salesUserName: d.salesUserName || 'Chưa gán',
            salesUserEmail: d.salesUserEmail,
            employeeCode: d.employeeCode,
            totalDossiers: total,
            approvedDossiers: approved,
            completedDossiers: completed,
            completionRate:
              total > 0 ? Math.round((approved / total) * 100) : 0,
            totalRevenue: fin.totalRevenue,
            totalCost: fin.totalCost,
            totalProfit: fin.totalProfit,
          };
        })
        .sort((a, b) => b.totalDossiers - a.totalDossiers);
    };

    if (!this.redisService) return compute();
    return this.redisService.getOrCompute(cacheKey, compute, 60);
  }

  async getOperatorMonthlyTrend(organizationId: string, monthsCount = 6) {
    const cacheKey = `dashboard:operator:monthly-trend:v2:${organizationId}:${monthsCount}`;

    const compute = async () => {
      const currentRange = resolvePeriodRange('MONTHLY', new Date());
      const windowStartDate = new Date(
        Date.UTC(currentRange.year, currentRange.month - 1 - (monthsCount - 1), 1),
      );
      const startRange = resolvePeriodRange(
        'MONTHLY',
        `${windowStartDate.getUTCFullYear()}-${String(windowStartDate.getUTCMonth() + 1).padStart(2, '0')}-01`,
      );

      const dossierMonthExpr = zonedMonthKeySql(
        'dossier.created_at',
        DEFAULT_BUSINESS_TIMEZONE,
      );

      const [monthlyDossiers, monthlyFinancials] = await Promise.all([
        this.dossierRepository
          .createQueryBuilder('dossier')
          .select(dossierMonthExpr, 'monthKey')
          .addSelect('COUNT(dossier.id)', 'totalDossiers')
          .addSelect(
            `COUNT(CASE WHEN dossier.status IN ('APPROVED', 'COMPLETED') THEN 1 END)`,
            'approvedDossiers',
          )
          .where('dossier.organizationId = :organizationId', { organizationId })
          .andWhere('dossier.createdAt >= :startDate', {
            startDate: startRange.startUtc,
          })
          .groupBy(dossierMonthExpr)
          .orderBy('"monthKey"', 'ASC')
          .getRawMany(),
        this.financialReadModel.getMonthlyFinancialTrend({
          organizationId,
          startUtc: startRange.startUtc,
        }),
      ]);

      const finMap = new Map(monthlyFinancials.map((m) => [m.monthKey, m]));
      const result: Array<{
        monthKey: string;
        label: string;
        totalDossiers: number;
        approvedDossiers: number;
        totalRevenue: number;
      }> = [];

      for (let i = monthsCount - 1; i >= 0; i--) {
        const d = new Date(
          Date.UTC(currentRange.year, currentRange.month - 1 - i, 1),
        );
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth() + 1;
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const label = `T${String(month).padStart(2, '0')}/${year}`;
        const dossierStat = monthlyDossiers.find(
          (m) => m.monthKey === monthKey,
        );
        const finStat = finMap.get(monthKey);
        result.push({
          monthKey,
          label,
          totalDossiers: Number(dossierStat?.totalDossiers || 0),
          approvedDossiers: Number(dossierStat?.approvedDossiers || 0),
          totalRevenue: finStat?.revenue ?? 0,
        });
      }

      return result;
    };

    if (!this.redisService) return compute();
    return this.redisService.getOrCompute(cacheKey, compute, 60);
  }

  async getCeoDashboard(organizationId: string, queryDto: QueryDashboardDto) {
    const periodType = queryDto.periodType || KpiPeriodType.MONTHLY;
    const allTime = queryDto.allTime === true;
    const { startUtc, endUtc } = resolvePeriodRange(periodType, queryDto.date);

    const cacheKey = `dashboard:ceo:v9:${organizationId}:${allTime ? 'all-time' : `${periodType}:${queryDto.date || 'current'}`}`;

    const compute = async () => {
      const [
        approvedEstimateIds,
        funnelBreakdown,
        vipCustomers,
        costBreakdown,
        businessLineBreakdown,
        supplierSpendSummary,
        marketDossierBreakdown,
        marketRevenueBreakdown,
        marketCostBreakdown,
        dossierVelocity,
      ] = await Promise.all([
        this.financialReadModel.getLatestApprovedEstimateIds({
          organizationId,
          startUtc,
          endUtc,
          allTime,
        }),
        this.dossierRepository
          .createQueryBuilder('dossier')
          .select('dossier.status', 'status')
          .addSelect('COUNT(dossier.id)', 'count')
          .where('dossier.organizationId = :organizationId', { organizationId })
          .groupBy('dossier.status')
          .getRawMany(),
        this.financialReadModel.getTopCustomerRevenue({
          organizationId,
          startUtc,
          endUtc,
          allTime,
          limit: 5,
        }),
        this.costLineRepository
          .createQueryBuilder('line')
          .select('category.name', 'categoryName')
          .addSelect(
            `COALESCE(SUM(${VALUED_COST_NET_SQL('line')}), 0)`,
            'amount',
          )
          .innerJoin('line.estimate', 'estimate')
          .innerJoin('estimate.dossier', 'dossier')
          .innerJoin('line.serviceCategory', 'category')
          .where('dossier.organizationId = :organizationId', { organizationId })
          .andWhere('line.organizationId = :organizationId', { organizationId })
          .andWhere('estimate.status = :approvedEstimateStatus', {
            approvedEstimateStatus: EstimateStatus.APPROVED,
          })
          .andWhere(`estimate.id = ${LATEST_APPROVED_ESTIMATE_SUBQUERY}`, {
            organizationId,
            approvedEstimateStatus: EstimateStatus.APPROVED,
          })
          .groupBy('category.name')
          .getRawMany(),
        this.revenueLineRepository
          .createQueryBuilder('line')
          .select(
            "COALESCE(NULLIF(dossier.business_line_name, ''), 'Chưa phân loại')",
            'businessLineName',
          )
          .addSelect(
            `COALESCE(SUM(${VALUED_REVENUE_NET_SQL('line')}), 0)`,
            'amount',
          )
          .innerJoin('line.estimate', 'estimate')
          .innerJoin('estimate.dossier', 'dossier')
          .where('dossier.organizationId = :organizationId', { organizationId })
          .andWhere('line.organizationId = :organizationId', { organizationId })
          .andWhere('estimate.status = :approvedEstimateStatus', {
            approvedEstimateStatus: EstimateStatus.APPROVED,
          })
          .andWhere(`estimate.id = ${LATEST_APPROVED_ESTIMATE_SUBQUERY}`, {
            organizationId,
            approvedEstimateStatus: EstimateStatus.APPROVED,
          })
          .andWhere(
            '(:allTime = true OR estimate.approvedAt BETWEEN :start AND :end)',
            {
              allTime,
              start: startUtc,
              end: endUtc,
            },
          )
          .groupBy(
            "COALESCE(NULLIF(dossier.business_line_name, ''), 'Chưa phân loại')",
          )
          .orderBy('amount', 'DESC')
          .getRawMany(),
        this.financialReadModel.getSupplierSpendSummary({
          organizationId,
          startUtc,
          endUtc,
          allTime,
          topLimit: 6,
        }),
        this.dossierRepository
          .createQueryBuilder('dossier')
          .select(
            "COALESCE(NULLIF(dossier.market_type_name, ''), 'Chưa phân loại')",
            'marketName',
          )
          .addSelect('COUNT(DISTINCT dossier.id)', 'dossiers')
          .innerJoin('dossier.estimates', 'estimate')
          .where('dossier.organizationId = :organizationId', { organizationId })
          .andWhere('estimate.status = :approvedEstimateStatus', {
            approvedEstimateStatus: EstimateStatus.APPROVED,
          })
          .andWhere(`estimate.id = ${LATEST_APPROVED_ESTIMATE_SUBQUERY}`, {
            organizationId,
            approvedEstimateStatus: EstimateStatus.APPROVED,
          })
          .andWhere(
            '(:allTime = true OR estimate.approvedAt BETWEEN :start AND :end)',
            {
              allTime,
              start: startUtc,
              end: endUtc,
            },
          )
          .groupBy(
            "COALESCE(NULLIF(dossier.market_type_name, ''), 'Chưa phân loại')",
          )
          .getRawMany(),
        this.revenueLineRepository
          .createQueryBuilder('line')
          .select(
            "COALESCE(NULLIF(dossier.market_type_name, ''), 'Chưa phân loại')",
            'marketName',
          )
          .addSelect(
            `COALESCE(SUM(${VALUED_REVENUE_NET_SQL('line')}), 0)`,
            'revenue',
          )
          .innerJoin('line.estimate', 'estimate')
          .innerJoin('estimate.dossier', 'dossier')
          .where('dossier.organizationId = :organizationId', { organizationId })
          .andWhere('line.organizationId = :organizationId', { organizationId })
          .andWhere('estimate.status = :approvedEstimateStatus', {
            approvedEstimateStatus: EstimateStatus.APPROVED,
          })
          .andWhere(`estimate.id = ${LATEST_APPROVED_ESTIMATE_SUBQUERY}`, {
            organizationId,
            approvedEstimateStatus: EstimateStatus.APPROVED,
          })
          .andWhere(
            '(:allTime = true OR estimate.approvedAt BETWEEN :start AND :end)',
            {
              allTime,
              start: startUtc,
              end: endUtc,
            },
          )
          .groupBy(
            "COALESCE(NULLIF(dossier.market_type_name, ''), 'Chưa phân loại')",
          )
          .orderBy('revenue', 'DESC')
          .getRawMany(),
        this.costLineRepository
          .createQueryBuilder('line')
          .select(
            "COALESCE(NULLIF(dossier.market_type_name, ''), 'Chưa phân loại')",
            'marketName',
          )
          .addSelect(
            `COALESCE(SUM(${VALUED_COST_NET_SQL('line')}), 0)`,
            'cost',
          )
          .innerJoin('line.estimate', 'estimate')
          .innerJoin('estimate.dossier', 'dossier')
          .where('dossier.organizationId = :organizationId', { organizationId })
          .andWhere('line.organizationId = :organizationId', { organizationId })
          .andWhere('estimate.status = :approvedEstimateStatus', {
            approvedEstimateStatus: EstimateStatus.APPROVED,
          })
          .andWhere(`estimate.id = ${LATEST_APPROVED_ESTIMATE_SUBQUERY}`, {
            organizationId,
            approvedEstimateStatus: EstimateStatus.APPROVED,
          })
          .andWhere(
            '(:allTime = true OR estimate.approvedAt BETWEEN :start AND :end)',
            {
              allTime,
              start: startUtc,
              end: endUtc,
            },
          )
          .groupBy(
            "COALESCE(NULLIF(dossier.market_type_name, ''), 'Chưa phân loại')",
          )
          .getRawMany(),
        this.dossierRepository
          .createQueryBuilder('dossier')
          .select(
            'AVG(EXTRACT(EPOCH FROM (dossier.updated_at - dossier.created_at)) / 86400)',
            'avgDays',
          )
          .where('dossier.organizationId = :organizationId', { organizationId })
          .andWhere('dossier.status = :status', {
            status: DossierStatus.COMPLETED,
          })
          .getRawOne(),
      ]);

      const totals = await this.financialReadModel.getValuedTotalsForEstimates(
        organizationId,
        approvedEstimateIds,
      );

      const marketMap = new Map<
        string,
        { dossiers: number; revenue: number; cost: number }
      >();
      marketDossierBreakdown.forEach((row) => {
        marketMap.set(row.marketName, {
          dossiers: Number(row.dossiers || 0),
          revenue: 0,
          cost: 0,
        });
      });
      marketRevenueBreakdown.forEach((row) => {
        const current = marketMap.get(row.marketName) || {
          dossiers: 0,
          revenue: 0,
          cost: 0,
        };
        current.revenue = Number(row.revenue || 0);
        marketMap.set(row.marketName, current);
      });
      marketCostBreakdown.forEach((row) => {
        const current = marketMap.get(row.marketName) || {
          dossiers: 0,
          revenue: 0,
          cost: 0,
        };
        current.cost = Number(row.cost || 0);
        marketMap.set(row.marketName, current);
      });

      return {
        totalRevenue: totals.revenueNet,
        totalProfit: totals.profit,
        funnel: funnelBreakdown.map((f) => ({
          status: f.status,
          count: Number(f.count),
        })),
        vipCustomers: vipCustomers.map((c) => ({
          customerId: c.customerId,
          customerName: c.customerName,
          spend: c.spend,
        })),
        costBreakdown: costBreakdown.map((cb) => ({
          categoryName: cb.categoryName,
          amount: Math.round(Number(cb.amount || 0)),
        })),
        revenueBreakdown: marketRevenueBreakdown.map((row) => ({
          marketTypeName: row.marketName,
          amount: Math.round(Number(row.revenue || 0)),
        })),
        businessLineBreakdown: businessLineBreakdown.map((row) => ({
          businessLineName: row.businessLineName,
          amount: Math.round(Number(row.amount || 0)),
        })),
        ...this.formatSupplierSpendResponse(supplierSpendSummary),
        marketBreakdown: Array.from(marketMap.entries())
          .map(([marketName, values]) => ({
            marketName,
            dossiers: values.dossiers,
            revenue: Math.round(values.revenue),
            profit: Math.round(values.revenue - values.cost),
          }))
          .sort((a, b) => b.revenue - a.revenue),
        avgDossierClosingDays: Number(
          Number(dossierVelocity?.avgDays || 0).toFixed(1),
        ),
      };
    };

    if (!this.redisService) return compute();
    return this.redisService.getOrCompute(cacheKey, compute, 60);
  }

  async getCeoMonthlyTrend(
    organizationId: string,
    year = resolvePeriodRange('YEARLY', new Date()).year,
    allTime = false,
  ) {
    const cacheKey = `dashboard:ceo:monthly-trend:v2:${organizationId}:${allTime ? 'all-time' : year}`;

    const compute = async () => {
      const yearRange = resolvePeriodRange('YEARLY', `${year}-01-01`);
      const dossierMonthExpr = zonedMonthKeySql(
        'dossier.created_at',
        DEFAULT_BUSINESS_TIMEZONE,
      );

      const [monthlyFinancials, monthlyDossiers] = await Promise.all([
        this.financialReadModel.getMonthlyFinancialTrend({
          organizationId,
          year,
          startUtc: yearRange.startUtc,
          endUtc: yearRange.endUtc,
          allTime,
        }),
        this.dossierRepository
          .createQueryBuilder('dossier')
          .select(dossierMonthExpr, 'monthKey')
          .addSelect(
            `COUNT(CASE WHEN dossier.status IN ('APPROVED', 'COMPLETED') THEN 1 END)`,
            'approvedDossiers',
          )
          .where('dossier.organizationId = :organizationId', { organizationId })
          .andWhere(
            '(:allTime = true OR dossier.createdAt BETWEEN :startDate AND :endDate)',
            {
              allTime,
              startDate: yearRange.startUtc,
              endDate: yearRange.endUtc,
            },
          )
          .groupBy(dossierMonthExpr)
          .getRawMany(),
      ]);

      const finMap = new Map(monthlyFinancials.map((m) => [m.monthKey, m]));
      const dossierMap = new Map<string, number>();
      monthlyDossiers.forEach((d) =>
        dossierMap.set(d.monthKey, Number(d.approvedDossiers || 0)),
      );

      const monthKeys = allTime
        ? [...new Set([...finMap.keys(), ...dossierMap.keys()])].sort()
        : Array.from(
            { length: 12 },
            (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`,
          );

      return monthKeys.map((monthKey) => {
        const [monthYear, monthNumber] = monthKey.split('-');
        const label = allTime
          ? `T${monthNumber}/${monthYear}`
          : `T${monthNumber}`;
        const fin = finMap.get(monthKey);
        return {
          monthKey,
          label,
          totalRevenue: fin?.revenue ?? 0,
          totalCost: fin?.cost ?? 0,
          totalProfit: fin?.profit ?? 0,
          approvedDossiers: dossierMap.get(monthKey) || 0,
        };
      });
    };

    if (!this.redisService) return compute();
    return this.redisService.getOrCompute(cacheKey, compute, 60);
  }
}
