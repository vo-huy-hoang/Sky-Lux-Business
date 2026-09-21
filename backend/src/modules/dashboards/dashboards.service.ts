import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { Task } from '../tasks/entities/task.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { KpiResult } from '../kpis/entities/kpi-result.entity';
import { RedisService } from '../../common/redis/redis.service';
import {
  DossierStatus,
  EstimateStatus,
  TaskStatus,
  KpiPeriodType,
} from '../../common/enums';

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
    @Optional()
    private readonly redisService?: RedisService,
  ) {}

  async getSalesDashboard(
    organizationId: string,
    userId: string,
    queryDto: QueryDashboardDto,
  ) {
    const periodType = queryDto.periodType || KpiPeriodType.MONTHLY;
    const { periodStart, periodEnd } = this.getPeriodDates(
      periodType,
      queryDto.date,
    );

    const cacheKey = `dashboard:sales:${organizationId}:${userId}:${periodType}:${queryDto.date || 'current'}`;
    if (this.redisService) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return cached;
    }

    // Parallel DB queries: approved estimates + dossiers breakdown + tasks breakdown
    const [approvedEstimates, dossiersBreakdown, tasksBreakdown] =
      await Promise.all([
        this.getApprovedEstimates(
          organizationId,
          userId,
          periodStart,
          periodEnd,
        ),
        this.dossierRepository
          .createQueryBuilder('dossier')
          .select('dossier.status', 'status')
          .addSelect('COUNT(dossier.id)', 'count')
          .where('dossier.salesUserId = :userId', { userId })
          .andWhere('dossier.organizationId = :organizationId', {
            organizationId,
          })
          .andWhere('dossier.createdAt BETWEEN :start AND :end', {
            start: new Date(periodStart + 'T00:00:00Z'),
            end: new Date(periodEnd + 'T23:59:59Z'),
          })
          .groupBy('dossier.status')
          .getRawMany(),
        this.taskRepository
          .createQueryBuilder('task')
          .select('task.status', 'status')
          .addSelect('COUNT(task.id)', 'count')
          .where('task.assignedTo = :userId', { userId })
          .andWhere('task.organizationId = :organizationId', { organizationId })
          .groupBy('task.status')
          .getRawMany(),
      ]);

    let revenue = 0;
    let cost = 0;

    if (approvedEstimates.length > 0) {
      const estimateIds = approvedEstimates.map((e) => e.id);
      const [revSum, costSum] = await Promise.all([
        this.revenueLineRepository
          .createQueryBuilder('line')
          .select('SUM(line.netAmount)', 'sum')
          .where('line.estimateId IN (:...estimateIds)', { estimateIds })
          .getRawOne(),
        this.costLineRepository
          .createQueryBuilder('line')
          .select('SUM(line.netAmount)', 'sum')
          .where('line.estimateId IN (:...estimateIds)', { estimateIds })
          .getRawOne(),
      ]);
      revenue = Number(revSum?.sum || 0);
      cost = Number(costSum?.sum || 0);
    }

    const profit = revenue - cost;

    const result = {
      revenue,
      profit,
      dossiersBreakdown: dossiersBreakdown.map((d) => ({
        status: d.status,
        count: Number(d.count),
      })),
      tasksBreakdown: tasksBreakdown.map((t) => ({
        status: t.status,
        count: Number(t.count),
      })),
    };

    if (this.redisService) {
      await this.redisService.set(cacheKey, result, 60);
    }

    return result;
  }

  async getOperatorDashboard(
    organizationId: string,
    queryDto: QueryDashboardDto,
  ) {
    const periodType = queryDto.periodType || KpiPeriodType.MONTHLY;
    const { periodStart, periodEnd } = this.getPeriodDates(
      periodType,
      queryDto.date,
    );

    const cacheKey = `dashboard:operator:${organizationId}:${periodType}:${queryDto.date || 'current'}`;
    if (this.redisService) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return cached;
    }

    // Parallel DB queries: active dossiers + priority breakdown + overdue tasks + task breakdown + total suppliers
    const [
      activeDossiersCount,
      priorityBreakdown,
      overdueTasksCount,
      tasksBreakdown,
      totalSuppliers,
    ] = await Promise.all([
      this.dossierRepository
        .createQueryBuilder('dossier')
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('dossier.status NOT IN (:...inactiveStatuses)', {
          inactiveStatuses: [
            DossierStatus.COMPLETED,
            DossierStatus.CANCELLED,
            DossierStatus.LOCKED,
          ],
        })
        .getCount(),
      this.dossierRepository
        .createQueryBuilder('dossier')
        .select('dossier.priority', 'priority')
        .addSelect('COUNT(dossier.id)', 'count')
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('dossier.status NOT IN (:...inactiveStatuses)', {
          inactiveStatuses: [
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
        .andWhere('task.status NOT IN (:...completedStatuses)', {
          completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
        })
        .andWhere('task.dueAt < :now', { now: new Date() })
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
    ]);

    const result = {
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
    };

    if (this.redisService) {
      await this.redisService.set(cacheKey, result, 60);
    }

    return result;
  }

  async getOperatorSalesSummary(organizationId: string) {
    const cacheKey = `dashboard:operator:sales-summary:${organizationId}`;
    if (this.redisService) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return cached;
    }

    // Parallel DB queries: dossiers + salesRevenue + salesCost
    const [dossiers, salesRevenue, salesCost] = await Promise.all([
      this.dossierRepository
        .createQueryBuilder('dossier')
        .leftJoin('dossier.salesUser', 'user')
        .select('dossier.salesUserId', 'salesUserId')
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
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('dossier.salesUserId IS NOT NULL')
        .groupBy('dossier.salesUserId')
        .addGroupBy('user.fullName')
        .addGroupBy('user.email')
        .addGroupBy('user.employeeCode')
        .getRawMany(),
      this.revenueLineRepository
        .createQueryBuilder('line')
        .innerJoin('line.estimate', 'estimate')
        .innerJoin('estimate.dossier', 'dossier')
        .select('dossier.salesUserId', 'salesUserId')
        .addSelect('SUM(line.netAmount)', 'revenue')
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('estimate.status = :status', {
          status: EstimateStatus.APPROVED,
        })
        .andWhere('dossier.salesUserId IS NOT NULL')
        .groupBy('dossier.salesUserId')
        .getRawMany(),
      this.costLineRepository
        .createQueryBuilder('line')
        .innerJoin('line.estimate', 'estimate')
        .innerJoin('estimate.dossier', 'dossier')
        .select('dossier.salesUserId', 'salesUserId')
        .addSelect('SUM(line.netAmount)', 'cost')
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('estimate.status = :status', {
          status: EstimateStatus.APPROVED,
        })
        .andWhere('dossier.salesUserId IS NOT NULL')
        .groupBy('dossier.salesUserId')
        .getRawMany(),
    ]);

    const revMap = new Map<string, number>();
    salesRevenue.forEach((r) =>
      revMap.set(r.salesUserId, Number(r.revenue || 0)),
    );

    const costMap = new Map<string, number>();
    salesCost.forEach((c) => costMap.set(c.salesUserId, Number(c.cost || 0)));

    const result = dossiers
      .map((d) => {
        const total = Number(d.totalDossiers || 0);
        const approved = Number(d.approvedDossiers || 0);
        const completed = Number(d.completedDossiers || 0);
        const rev = revMap.get(d.salesUserId) || 0;
        const cost = costMap.get(d.salesUserId) || 0;
        return {
          salesUserId: d.salesUserId,
          salesUserName: d.salesUserName || 'Chưa gán',
          salesUserEmail: d.salesUserEmail,
          employeeCode: d.employeeCode,
          totalDossiers: total,
          approvedDossiers: approved,
          completedDossiers: completed,
          completionRate: total > 0 ? Math.round((approved / total) * 100) : 0,
          totalRevenue: rev,
          totalCost: cost,
          totalProfit: rev - cost,
        };
      })
      .sort((a, b) => b.totalDossiers - a.totalDossiers);

    if (this.redisService) {
      await this.redisService.set(cacheKey, result, 60);
    }

    return result;
  }

  async getOperatorMonthlyTrend(organizationId: string, monthsCount = 6) {
    const cacheKey = `dashboard:operator:monthly-trend:${organizationId}:${monthsCount}`;
    if (this.redisService) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return cached;
    }

    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - (monthsCount - 1),
      1,
    );

    const [monthlyDossiers, monthlyRevenue] = await Promise.all([
      this.dossierRepository
        .createQueryBuilder('dossier')
        .select("TO_CHAR(dossier.createdAt, 'YYYY-MM')", 'monthKey')
        .addSelect('COUNT(dossier.id)', 'totalDossiers')
        .addSelect(
          `COUNT(CASE WHEN dossier.status IN ('APPROVED', 'COMPLETED') THEN 1 END)`,
          'approvedDossiers',
        )
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('dossier.createdAt >= :startDate', { startDate })
        .groupBy("TO_CHAR(dossier.createdAt, 'YYYY-MM')")
        .orderBy('"monthKey"', 'ASC')
        .getRawMany(),
      this.revenueLineRepository
        .createQueryBuilder('line')
        .innerJoin('line.estimate', 'estimate')
        .innerJoin('estimate.dossier', 'dossier')
        .select("TO_CHAR(estimate.approvedAt, 'YYYY-MM')", 'monthKey')
        .addSelect('SUM(line.netAmount)', 'revenue')
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('estimate.status = :status', {
          status: EstimateStatus.APPROVED,
        })
        .andWhere('estimate.approvedAt >= :startDate', { startDate })
        .groupBy("TO_CHAR(estimate.approvedAt, 'YYYY-MM')")
        .getRawMany(),
    ]);

    const result: Array<{
      monthKey: string;
      label: string;
      totalDossiers: number;
      approvedDossiers: number;
      totalRevenue: number;
    }> = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const label = `T${String(month).padStart(2, '0')}/${year}`;
      const dossierStat = monthlyDossiers.find((m) => m.monthKey === monthKey);
      const revStat = monthlyRevenue.find((r) => r.monthKey === monthKey);
      result.push({
        monthKey,
        label,
        totalDossiers: Number(dossierStat?.totalDossiers || 0),
        approvedDossiers: Number(dossierStat?.approvedDossiers || 0),
        totalRevenue: Number(revStat?.revenue || 0),
      });
    }

    if (this.redisService) {
      await this.redisService.set(cacheKey, result, 60);
    }

    return result;
  }

  async getCeoDashboard(organizationId: string, queryDto: QueryDashboardDto) {
    const periodType = queryDto.periodType || KpiPeriodType.MONTHLY;
    const { periodStart, periodEnd } = this.getPeriodDates(
      periodType,
      queryDto.date,
    );

    const cacheKey = `dashboard:ceo:v6:${organizationId}:${periodType}:${queryDto.date || 'current'}`;
    if (this.redisService) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return cached;
    }

    // Parallel DB queries: approved estimates + funnel breakdown + revenue/customer/cost breakdowns + velocity
    const [
      approvedEstimates,
      funnelBreakdown,
      vipCustomers,
      costBreakdown,
      businessLineBreakdown,
      supplierBreakdown,
      marketDossierBreakdown,
      marketRevenueBreakdown,
      marketCostBreakdown,
      dossierVelocity,
    ] = await Promise.all([
      this.estimateRepository
        .createQueryBuilder('estimate')
        .innerJoin('estimate.dossier', 'dossier')
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('estimate.status = :status', {
          status: EstimateStatus.APPROVED,
        })
        .andWhere('estimate.approvedAt BETWEEN :start AND :end', {
          start: new Date(periodStart + 'T00:00:00Z'),
          end: new Date(periodEnd + 'T23:59:59Z'),
        })
        .getMany(),
      this.dossierRepository
        .createQueryBuilder('dossier')
        .select('dossier.status', 'status')
        .addSelect('COUNT(dossier.id)', 'count')
        .where('dossier.organizationId = :organizationId', { organizationId })
        .groupBy('dossier.status')
        .getRawMany(),
      this.revenueLineRepository
        .createQueryBuilder('line')
        .select('customer.displayName', 'customerName')
        .addSelect('SUM(line.netAmount)', 'spend')
        .innerJoin('line.estimate', 'estimate')
        .innerJoin('estimate.dossier', 'dossier')
        .innerJoin('dossier.customer', 'customer')
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('estimate.status = :status', {
          status: EstimateStatus.APPROVED,
        })
        .groupBy('customer.displayName')
        .orderBy('spend', 'DESC')
        .limit(5)
        .getRawMany(),
      this.costLineRepository
        .createQueryBuilder('line')
        .select('category.name', 'categoryName')
        .addSelect('SUM(line.netAmount)', 'amount')
        .innerJoin('line.estimate', 'estimate')
        .innerJoin('estimate.dossier', 'dossier')
        .innerJoin('line.serviceCategory', 'category')
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('estimate.status = :status', {
          status: EstimateStatus.APPROVED,
        })
        .groupBy('category.name')
        .getRawMany(),
      this.revenueLineRepository
        .createQueryBuilder('line')
        .select(
          "COALESCE(NULLIF(dossier.business_line_name, ''), 'Chưa phân loại')",
          'businessLineName',
        )
        .addSelect('SUM(line.netAmount)', 'amount')
        .innerJoin('line.estimate', 'estimate')
        .innerJoin('estimate.dossier', 'dossier')
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('estimate.status = :status', {
          status: EstimateStatus.APPROVED,
        })
        .andWhere('estimate.approvedAt BETWEEN :start AND :end', {
          start: new Date(periodStart + 'T00:00:00Z'),
          end: new Date(periodEnd + 'T23:59:59Z'),
        })
        .groupBy(
          "COALESCE(NULLIF(dossier.business_line_name, ''), 'Chưa phân loại')",
        )
        .orderBy('amount', 'DESC')
        .getRawMany(),
      this.costLineRepository
        .createQueryBuilder('line')
        .select('supplier.id', 'supplierId')
        .addSelect('supplier.code', 'supplierCode')
        .addSelect('supplier.name', 'supplierName')
        // Supplier names come from every dossier. Financial values are
        // intentionally restricted to dossiers locked by CEO_ADMIN.
        .addSelect(
          `COALESCE(SUM(CASE
            WHEN dossier.status = :lockedDossierStatus
             AND dossier.locked_at BETWEEN :lockedStart AND :lockedEnd
            THEN line.net_amount
            ELSE 0
          END), 0)`,
          'amount',
        )
        .addSelect(
          `COALESCE(SUM(CASE
            WHEN dossier.status = :lockedDossierStatus
             AND dossier.locked_at BETWEEN :lockedStart AND :lockedEnd
            THEN line.gross_amount
            ELSE 0
          END), 0)`,
          'grossAmount',
        )
        .addSelect('COUNT(DISTINCT dossier.id)', 'dossierCount')
        .innerJoin('line.estimate', 'estimate')
        .innerJoin('estimate.dossier', 'dossier')
        .innerJoin('line.supplier', 'supplier')
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('line.organizationId = :organizationId', { organizationId })
        .setParameters({
          lockedDossierStatus: DossierStatus.LOCKED,
          lockedStart: new Date(periodStart + 'T00:00:00Z'),
          lockedEnd: new Date(periodEnd + 'T23:59:59Z'),
        })
        .groupBy('supplier.id')
        .addGroupBy('supplier.code')
        .addGroupBy('supplier.name')
        .orderBy('amount', 'DESC')
        .limit(6)
        .getRawMany(),
      this.dossierRepository
        .createQueryBuilder('dossier')
        .select(
          "COALESCE(NULLIF(dossier.market_type_name, ''), 'Chưa phân loại')",
          'marketName',
        )
        .addSelect('COUNT(DISTINCT dossier.id)', 'dossiers')
        .innerJoin('dossier.estimates', 'estimate')
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('estimate.status = :status', {
          status: EstimateStatus.APPROVED,
        })
        .andWhere('estimate.approvedAt BETWEEN :start AND :end', {
          start: new Date(periodStart + 'T00:00:00Z'),
          end: new Date(periodEnd + 'T23:59:59Z'),
        })
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
        .addSelect('SUM(line.netAmount)', 'revenue')
        .innerJoin('line.estimate', 'estimate')
        .innerJoin('estimate.dossier', 'dossier')
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('estimate.status = :status', {
          status: EstimateStatus.APPROVED,
        })
        .andWhere('estimate.approvedAt BETWEEN :start AND :end', {
          start: new Date(periodStart + 'T00:00:00Z'),
          end: new Date(periodEnd + 'T23:59:59Z'),
        })
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
        .addSelect('SUM(line.netAmount)', 'cost')
        .innerJoin('line.estimate', 'estimate')
        .innerJoin('estimate.dossier', 'dossier')
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('estimate.status = :status', {
          status: EstimateStatus.APPROVED,
        })
        .andWhere('estimate.approvedAt BETWEEN :start AND :end', {
          start: new Date(periodStart + 'T00:00:00Z'),
          end: new Date(periodEnd + 'T23:59:59Z'),
        })
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

    let totalRevenue = 0;
    let totalProfit = 0;

    if (approvedEstimates.length > 0) {
      const estimateIds = approvedEstimates.map((e) => e.id);
      const [revSum, grossProfit] = await Promise.all([
        this.revenueLineRepository
          .createQueryBuilder('line')
          .select('SUM(line.netAmount)', 'sum')
          .where('line.estimateId IN (:...estimateIds)', { estimateIds })
          .getRawOne(),
        this.calculateGrossProfitForEstimates(estimateIds, organizationId),
      ]);
      totalRevenue = Number(revSum?.sum || 0);
      totalProfit = grossProfit;
    }

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

    const result = {
      totalRevenue,
      totalProfit,
      funnel: funnelBreakdown.map((f) => ({
        status: f.status,
        count: Number(f.count),
      })),
      vipCustomers: vipCustomers.map((c) => ({
        customerName: c.customerName,
        spend: Number(c.spend),
      })),
      costBreakdown: costBreakdown.map((cb) => ({
        categoryName: cb.categoryName,
        amount: Number(cb.amount),
      })),
      revenueBreakdown: marketRevenueBreakdown.map((row) => ({
        marketTypeName: row.marketName,
        amount: Number(row.revenue || 0),
      })),
      businessLineBreakdown: businessLineBreakdown.map((row) => ({
        businessLineName: row.businessLineName,
        amount: Number(row.amount || 0),
      })),
      supplierBreakdown: supplierBreakdown.map((row) => ({
        supplierId: row.supplierId,
        supplierCode: row.supplierCode,
        supplierName: row.supplierName,
        amount: Number(row.amount || 0),
        grossAmount: Number(row.grossAmount || 0),
        dossierCount: Number(row.dossierCount || 0),
      })),
      marketBreakdown: Array.from(marketMap.entries())
        .map(([marketName, values]) => ({
          marketName,
          dossiers: values.dossiers,
          revenue: values.revenue,
          profit: values.revenue - values.cost,
        }))
        .sort((a, b) => b.revenue - a.revenue),
      avgDossierClosingDays: Number(
        Number(dossierVelocity?.avgDays || 0).toFixed(1),
      ),
    };

    if (this.redisService) {
      await this.redisService.set(cacheKey, result, 60);
    }

    return result;
  }

  async getCeoMonthlyTrend(
    organizationId: string,
    year = new Date().getFullYear(),
  ) {
    const cacheKey = `dashboard:ceo:monthly-trend:${organizationId}:${year}`;
    if (this.redisService) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) return cached;
    }

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const [monthlyRevenue, monthlyCost, monthlyDossiers] = await Promise.all([
      this.revenueLineRepository
        .createQueryBuilder('line')
        .innerJoin('line.estimate', 'estimate')
        .innerJoin('estimate.dossier', 'dossier')
        .select("TO_CHAR(estimate.approvedAt, 'YYYY-MM')", 'monthKey')
        .addSelect('SUM(line.netAmount)', 'revenue')
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('estimate.status = :status', {
          status: EstimateStatus.APPROVED,
        })
        .andWhere('estimate.approvedAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        })
        .groupBy("TO_CHAR(estimate.approvedAt, 'YYYY-MM')")
        .getRawMany(),
      this.costLineRepository
        .createQueryBuilder('line')
        .innerJoin('line.estimate', 'estimate')
        .innerJoin('estimate.dossier', 'dossier')
        .select("TO_CHAR(estimate.approvedAt, 'YYYY-MM')", 'monthKey')
        .addSelect('SUM(line.netAmount)', 'cost')
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('estimate.status = :status', {
          status: EstimateStatus.APPROVED,
        })
        .andWhere('estimate.approvedAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        })
        .groupBy("TO_CHAR(estimate.approvedAt, 'YYYY-MM')")
        .getRawMany(),
      this.dossierRepository
        .createQueryBuilder('dossier')
        .select("TO_CHAR(dossier.createdAt, 'YYYY-MM')", 'monthKey')
        .addSelect(
          `COUNT(CASE WHEN dossier.status IN ('APPROVED', 'COMPLETED') THEN 1 END)`,
          'approvedDossiers',
        )
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('dossier.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        })
        .groupBy("TO_CHAR(dossier.createdAt, 'YYYY-MM')")
        .getRawMany(),
    ]);

    const revMap = new Map<string, number>();
    monthlyRevenue.forEach((r) =>
      revMap.set(r.monthKey, Number(r.revenue || 0)),
    );

    const costMap = new Map<string, number>();
    monthlyCost.forEach((c) => costMap.set(c.monthKey, Number(c.cost || 0)));

    const dossierMap = new Map<string, number>();
    monthlyDossiers.forEach((d) =>
      dossierMap.set(d.monthKey, Number(d.approvedDossiers || 0)),
    );

    const result: Array<{
      monthKey: string;
      label: string;
      totalRevenue: number;
      totalCost: number;
      totalProfit: number;
      approvedDossiers: number;
    }> = [];

    for (let month = 1; month <= 12; month++) {
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const label = `T${String(month).padStart(2, '0')}`;
      const totalRevenue = revMap.get(monthKey) || 0;
      const totalCost = costMap.get(monthKey) || 0;
      const totalProfit = totalRevenue - totalCost;
      const approvedDossiers = dossierMap.get(monthKey) || 0;

      result.push({
        monthKey,
        label,
        totalRevenue,
        totalCost,
        totalProfit,
        approvedDossiers,
      });
    }

    if (this.redisService) {
      await this.redisService.set(cacheKey, result, 60);
    }

    return result;
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

  /**
   * Matches the yellow "Lợi nhuận gộp" total in the dossier detail view.
   * The imported Excel amounts are calculated from quantity × multiplier ×
   * unit price. VAT lines are divided by 1.08, except category 1.4, which
   * is intentionally excluded by the workbook summary formula.
   */
  private async calculateGrossProfitForEstimates(
    estimateIds: string[],
    organizationId: string,
  ): Promise<number> {
    const [revenueLines, costLines] = await Promise.all([
      this.revenueLineRepository.find({
        where: {
          estimateId: In(estimateIds),
          organizationId,
        },
      }),
      this.costLineRepository.find({
        where: {
          estimateId: In(estimateIds),
          organizationId,
        },
        relations: { serviceCategory: true },
      }),
    ]);

    const totalRevenue = revenueLines.reduce(
      (sum, line) => sum + this.getWorkbookGrossAmount(line),
      0,
    );
    const totalCost = costLines.reduce((sum, line) => {
      const vatRate = this.toFiniteNumber(line.vatRate);
      const categoryCode = this.classifyCostCategory(line);

      if (vatRate > 0 && categoryCode === '1.4') {
        return sum;
      }

      const workbookAmount = this.getWorkbookGrossAmount(line);
      return sum + (vatRate > 0 ? workbookAmount / 1.08 : workbookAmount);
    }, 0);

    return Math.round(totalRevenue / 1.08 - totalCost);
  }

  private getWorkbookGrossAmount(line: {
    quantity?: number | string | null;
    multiplier?: number | string | null;
    unitPrice?: number | string | null;
  }): number {
    return (
      this.toFiniteNumber(line.quantity, 1) *
      this.toFiniteNumber(line.multiplier, 1) *
      this.toFiniteNumber(line.unitPrice)
    );
  }

  private classifyCostCategory(line: {
    description?: string | null;
    categoryTitle?: string | null;
    serviceCategory?: { name?: string | null } | null;
  }): string {
    const explicitCategory = (
      line.categoryTitle ||
      line.serviceCategory?.name ||
      ''
    )
      .toUpperCase()
      .trim();

    if (explicitCategory === 'VÉ THAM QUAN') return '1.1';
    if (explicitCategory === 'KHÁCH SẠN') return '1.2';
    if (explicitCategory === 'ĂN UỐNG') return '1.2b';
    if (explicitCategory === 'VẬN CHUYỂN') return '1.3';
    if (explicitCategory === 'CÁC DỊCH VỤ KHÁC') return '1.4';

    const description = (line.description || '').toLowerCase();
    const category = (line.serviceCategory?.name || '').toLowerCase();

    if (
      description.includes('gala') ||
      description.includes('team building') ||
      description.includes('hội nghị') ||
      category.includes('chi phí khác')
    ) {
      return '1.4';
    }
    if (
      description.includes('vé tham quan') ||
      description.includes('hội an') ||
      description.includes('bà nà') ||
      description.includes('đại nội') ||
      category.includes('vé tham quan')
    ) {
      return '1.1';
    }
    if (
      description.includes('khách sạn') ||
      description.includes('mường thanh') ||
      description.includes('hương giang') ||
      description.includes('phòng') ||
      category.includes('khách sạn')
    ) {
      return '1.2';
    }
    if (
      description.includes('ăn uống') ||
      description.includes('madam lân') ||
      description.includes('cơm niêu') ||
      description.includes('trưa ngày') ||
      description.includes('tối ngày') ||
      category.includes('nhà hàng')
    ) {
      return '1.2b';
    }
    if (
      description.includes('xe') ||
      description.includes('vận chuyển') ||
      description.includes('triệu bảo ý') ||
      category.includes('vận chuyển')
    ) {
      return '1.3';
    }

    return '1.4';
  }

  private toFiniteNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
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
}
