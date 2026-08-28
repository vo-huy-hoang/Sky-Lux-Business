import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { Task } from '../tasks/entities/task.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { KpiResult } from '../kpis/entities/kpi-result.entity';
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

    // 1. Approved Estimates (Revenue & Profit)
    const approvedEstimates = await this.getApprovedEstimates(
      organizationId,
      userId,
      periodStart,
      periodEnd,
    );
    let revenue = 0;
    let cost = 0;

    if (approvedEstimates.length > 0) {
      const estimateIds = approvedEstimates.map((e) => e.id);
      const revSum = await this.revenueLineRepository
        .createQueryBuilder('line')
        .select('SUM(line.netAmount)', 'sum')
        .where('line.estimateId IN (:...estimateIds)', { estimateIds })
        .getRawOne();
      revenue = Number(revSum?.sum || 0);

      const costSum = await this.costLineRepository
        .createQueryBuilder('line')
        .select('SUM(line.netAmount)', 'sum')
        .where('line.estimateId IN (:...estimateIds)', { estimateIds })
        .getRawOne();
      cost = Number(costSum?.sum || 0);
    }

    const profit = revenue - cost;

    // 2. Dossiers Status Breakdown
    const dossiersBreakdown = await this.dossierRepository
      .createQueryBuilder('dossier')
      .select('dossier.status', 'status')
      .addSelect('COUNT(dossier.id)', 'count')
      .where('dossier.salesUserId = :userId', { userId })
      .andWhere('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('dossier.createdAt BETWEEN :start AND :end', {
        start: new Date(periodStart + 'T00:00:00Z'),
        end: new Date(periodEnd + 'T23:59:59Z'),
      })
      .groupBy('dossier.status')
      .getRawMany();

    // 3. Tasks Progress
    const tasksBreakdown = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(task.id)', 'count')
      .where('task.assignedTo = :userId', { userId })
      .andWhere('task.organizationId = :organizationId', { organizationId })
      .groupBy('task.status')
      .getRawMany();

    return {
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

    // 1. Count active dossiers (not COMPLETED, CANCELLED, LOCKED)
    const activeDossiersCount = await this.dossierRepository
      .createQueryBuilder('dossier')
      .where('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('dossier.status NOT IN (:...inactiveStatuses)', {
        inactiveStatuses: [
          DossierStatus.COMPLETED,
          DossierStatus.CANCELLED,
          DossierStatus.LOCKED,
        ],
      })
      .getCount();

    // 2. Active Dossiers grouped by Priority
    const priorityBreakdown = await this.dossierRepository
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
      .getRawMany();

    // 3. Overdue Tasks
    const overdueTasksCount = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.organizationId = :organizationId', { organizationId })
      .andWhere('task.status NOT IN (:...completedStatuses)', {
        completedStatuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
      })
      .andWhere('task.dueAt < :now', { now: new Date() })
      .getCount();

    // 4. Tasks status breakdown
    const tasksBreakdown = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(task.id)', 'count')
      .where('task.organizationId = :organizationId', { organizationId })
      .groupBy('task.status')
      .getRawMany();

    // 5. Total suppliers
    const totalSuppliers = await this.supplierRepository.count({
      where: { organizationId },
    });

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
    };
  }

  async getCeoDashboard(organizationId: string, queryDto: QueryDashboardDto) {
    const periodType = queryDto.periodType || KpiPeriodType.MONTHLY;
    const { periodStart, periodEnd } = this.getPeriodDates(
      periodType,
      queryDto.date,
    );

    // 1. Cumulative Financials (All approved estimates)
    const approvedEstimates = await this.estimateRepository
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
      .getMany();

    let totalRevenue = 0;
    let totalCost = 0;

    if (approvedEstimates.length > 0) {
      const estimateIds = approvedEstimates.map((e) => e.id);
      const revSum = await this.revenueLineRepository
        .createQueryBuilder('line')
        .select('SUM(line.netAmount)', 'sum')
        .where('line.estimateId IN (:...estimateIds)', { estimateIds })
        .getRawOne();
      totalRevenue = Number(revSum?.sum || 0);

      const costSum = await this.costLineRepository
        .createQueryBuilder('line')
        .select('SUM(line.netAmount)', 'sum')
        .where('line.estimateId IN (:...estimateIds)', { estimateIds })
        .getRawOne();
      totalCost = Number(costSum?.sum || 0);
    }

    const totalProfit = totalRevenue - totalCost;

    // 2. Phễu chuyển đổi vụ việc (Dossiers Funnel)
    const funnelBreakdown = await this.dossierRepository
      .createQueryBuilder('dossier')
      .select('dossier.status', 'status')
      .addSelect('COUNT(dossier.id)', 'count')
      .where('dossier.organizationId = :organizationId', { organizationId })
      .groupBy('dossier.status')
      .getRawMany();

    // 3. Top VIP Customers by Spend
    const vipCustomers = await this.revenueLineRepository
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
      .getRawMany();

    // 4. Cost Breakdown by Service Category
    const costBreakdown = await this.costLineRepository
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
      .getRawMany();

    // 5. Time to Complete (Operational Velocity)
    const dossierVelocity = await this.dossierRepository
      .createQueryBuilder('dossier')
      .select(
        'AVG(EXTRACT(EPOCH FROM (dossier.updated_at - dossier.created_at)) / 86400)',
        'avgDays',
      )
      .where('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('dossier.status = :status', { status: DossierStatus.COMPLETED })
      .getRawOne();

    return {
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
      avgDossierClosingDays: Number(
        Number(dossierVelocity?.avgDays || 0).toFixed(1),
      ),
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
