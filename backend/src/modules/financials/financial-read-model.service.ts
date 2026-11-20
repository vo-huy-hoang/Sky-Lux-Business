import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estimate } from '../estimates/entities/estimate.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { DossierStatus, EstimateStatus } from '../../common/enums';
import {
  ValuationLineInput,
  toFiniteNumber,
  valuateEstimate,
} from '../../common/utils/estimate-valuation.util';
import {
  DEFAULT_BUSINESS_TIMEZONE,
  resolvePeriodRange,
} from '../../common/utils/period-range.util';
import {
  LATEST_APPROVED_ESTIMATE_SUBQUERY,
  VALUED_COST_NET_SQL,
  VALUED_REVENUE_NET_SQL,
  WORKBOOK_GROSS_SQL,
  zonedMonthKeySql,
} from './financial-read-model.sql';

export interface ValuedEstimateTotals {
  revenueGross: number;
  revenueNet: number;
  costGross: number;
  costNet: number;
  profit: number;
  marginPercent: number;
}

export interface ApprovedEstimateQueryParams {
  organizationId: string;
  salesUserId?: string;
  startUtc?: Date;
  endUtc?: Date;
  allTime?: boolean;
}

export interface MonthlyFinancialTrendParams {
  organizationId: string;
  year?: number;
  startUtc?: Date;
  endUtc?: Date;
  allTime?: boolean;
  timeZone?: string;
}

export interface MonthlyFinancialPoint {
  monthKey: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface SupplierSpendItem {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  amount: number;
  grossAmount: number;
  dossierCount: number;
  sharePercentage: number;
}

export interface SupplierSpendSummary {
  totalSupplierSpend: number;
  totalSupplierGrossSpend: number;
  topSuppliersSpend: number;
  otherSuppliersSpend: number;
  totalSuppliersCount: number;
  otherSuppliersCount: number;
  topSuppliers: SupplierSpendItem[];
}

export interface SupplierSpendQueryParams {
  organizationId: string;
  startUtc?: Date;
  endUtc?: Date;
  allTime?: boolean;
  topLimit?: number;
  countableStatuses?: DossierStatus[];
}

export interface TopCustomerRevenueItem {
  customerId: string;
  customerName: string;
  spend: number;
}

export interface TopCustomerRevenueParams {
  organizationId: string;
  startUtc?: Date;
  endUtc?: Date;
  allTime?: boolean;
  limit?: number;
}

export interface SalesFinancialStats {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
}

export interface RankableEstimate {
  status?: string | null;
  versionNo?: number | null;
  approvedAt?: Date | string | null;
  createdAt?: Date | string | null;
  deletedAt?: Date | string | null;
}

const DEFAULT_COUNTABLE_SUPPLIER_STATUSES: DossierStatus[] = [
  DossierStatus.COMPLETED,
  DossierStatus.LOCKED,
];

function toEpochMs(value?: Date | string | null): number {
  if (!value) return -Infinity;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : -Infinity;
}

@Injectable()
export class FinancialReadModelService {
  constructor(
    @InjectRepository(Estimate)
    private readonly estimateRepository: Repository<Estimate>,
    @InjectRepository(EstimateRevenueLine)
    private readonly revenueLineRepository: Repository<EstimateRevenueLine>,
    @InjectRepository(EstimateCostLine)
    private readonly costLineRepository: Repository<EstimateCostLine>,
  ) {}

  /**
   * Canonical in-memory ranking matching `LATEST_APPROVED_ESTIMATE_SUBQUERY`:
   * strictly non-deleted `APPROVED` estimates ordered by
   * `versionNo DESC, approvedAt DESC NULLS LAST, createdAt DESC`.
   */
  selectLatestApprovedEstimate<T extends RankableEstimate>(
    estimates: T[] = [],
  ): T | null {
    const approved = estimates.filter(
      (est) => !est.deletedAt && est.status === EstimateStatus.APPROVED,
    );
    if (approved.length === 0) return null;

    return [...approved].sort((a, b) => {
      const versionDiff = (b.versionNo ?? 0) - (a.versionNo ?? 0);
      if (versionDiff !== 0) return versionDiff;
      const approvedDiff = toEpochMs(b.approvedAt) - toEpochMs(a.approvedAt);
      if (approvedDiff !== 0) return approvedDiff;
      return toEpochMs(b.createdAt) - toEpochMs(a.createdAt);
    })[0];
  }

  /**
   * Returns IDs of the single latest non-deleted APPROVED estimate per dossier
   * matching the tenant, optional sales owner, and optional UTC period window.
   */
  async getLatestApprovedEstimateIds(
    params: ApprovedEstimateQueryParams,
  ): Promise<string[]> {
    const { organizationId, salesUserId, startUtc, endUtc, allTime } = params;

    const qb = this.estimateRepository
      .createQueryBuilder('estimate')
      .innerJoin('estimate.dossier', 'dossier')
      .select('estimate.id', 'id')
      .where('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('estimate.organizationId = :organizationId', { organizationId })
      .andWhere('estimate.status = :approvedEstimateStatus', {
        approvedEstimateStatus: EstimateStatus.APPROVED,
      })
      .andWhere(`estimate.id = ${LATEST_APPROVED_ESTIMATE_SUBQUERY}`, {
        organizationId,
        approvedEstimateStatus: EstimateStatus.APPROVED,
      });

    if (salesUserId) {
      qb.andWhere('dossier.salesUserId = :salesUserId', { salesUserId });
    }

    if (!allTime && startUtc && endUtc) {
      qb.andWhere('estimate.approvedAt BETWEEN :startUtc AND :endUtc', {
        startUtc,
        endUtc,
      });
    }

    const rows = await qb.getRawMany<{ id: string }>();
    return rows.map((row) => row.id).filter(Boolean);
  }

  /**
   * Computes canonical valued revenue, cost, profit, and margin across a set of estimate IDs.
   * Matches `EstimateValuation.valuateEstimate()` 1:1.
   */
  async getValuedTotalsForEstimates(
    organizationId: string,
    estimateIds: string[],
  ): Promise<ValuedEstimateTotals> {
    if (!estimateIds || estimateIds.length === 0) {
      return {
        revenueGross: 0,
        revenueNet: 0,
        costGross: 0,
        costNet: 0,
        profit: 0,
        marginPercent: 0,
      };
    }

    const [revRow, costRow] = await Promise.all([
      this.revenueLineRepository
        .createQueryBuilder('line')
        .select(`COALESCE(SUM(${WORKBOOK_GROSS_SQL('line')}), 0)`, 'revenueGross')
        .addSelect(
          `COALESCE(SUM(${VALUED_REVENUE_NET_SQL('line')}), 0)`,
          'revenueNet',
        )
        .where('line.organizationId = :organizationId', { organizationId })
        .andWhere('line.estimateId IN (:...estimateIds)', { estimateIds })
        .getRawOne(),
      this.costLineRepository
        .createQueryBuilder('line')
        .select(`COALESCE(SUM(${WORKBOOK_GROSS_SQL('line')}), 0)`, 'costGross')
        .addSelect(
          `COALESCE(SUM(${VALUED_COST_NET_SQL('line')}), 0)`,
          'costNet',
        )
        .where('line.organizationId = :organizationId', { organizationId })
        .andWhere('line.estimateId IN (:...estimateIds)', { estimateIds })
        .getRawOne(),
    ]);

    const revenueGross = Math.round(toFiniteNumber(revRow?.revenueGross, 0));
    const revenueNetExact = toFiniteNumber(revRow?.revenueNet, 0);
    const costGross = Math.round(toFiniteNumber(costRow?.costGross, 0));
    const costNetExact = toFiniteNumber(costRow?.costNet, 0);
    const profitExact = revenueNetExact - costNetExact;

    const revenueNet = Math.round(revenueNetExact);
    const costNet = Math.round(costNetExact);
    const profit = Math.round(profitExact);
    const marginPercent =
      revenueNetExact > 0
        ? Number(((profitExact / revenueNetExact) * 100).toFixed(2))
        : 0;

    return {
      revenueGross,
      revenueNet,
      costGross,
      costNet,
      profit,
      marginPercent,
    };
  }

  /**
   * Computes canonical valued totals grouped per estimate ID (for Estimates list/modals).
   */
  async getValuedTotalsByEstimateIds(
    organizationId: string,
    estimateIds: string[],
  ): Promise<Map<string, ValuedEstimateTotals>> {
    const map = new Map<string, ValuedEstimateTotals>();
    if (!estimateIds || estimateIds.length === 0) return map;

    const [revRows, costRows] = await Promise.all([
      this.revenueLineRepository
        .createQueryBuilder('line')
        .select('line.estimateId', 'estimateId')
        .addSelect(
          `COALESCE(SUM(${WORKBOOK_GROSS_SQL('line')}), 0)`,
          'revenueGross',
        )
        .addSelect(
          `COALESCE(SUM(${VALUED_REVENUE_NET_SQL('line')}), 0)`,
          'revenueNet',
        )
        .where('line.organizationId = :organizationId', { organizationId })
        .andWhere('line.estimateId IN (:...estimateIds)', { estimateIds })
        .groupBy('line.estimateId')
        .getRawMany(),
      this.costLineRepository
        .createQueryBuilder('line')
        .select('line.estimateId', 'estimateId')
        .addSelect(`COALESCE(SUM(${WORKBOOK_GROSS_SQL('line')}), 0)`, 'costGross')
        .addSelect(
          `COALESCE(SUM(${VALUED_COST_NET_SQL('line')}), 0)`,
          'costNet',
        )
        .where('line.organizationId = :organizationId', { organizationId })
        .andWhere('line.estimateId IN (:...estimateIds)', { estimateIds })
        .groupBy('line.estimateId')
        .getRawMany(),
    ]);

    const revMap = new Map<string, { gross: number; net: number }>();
    for (const r of revRows) {
      revMap.set(r.estimateId, {
        gross: toFiniteNumber(r.revenueGross, 0),
        net: toFiniteNumber(r.revenueNet, 0),
      });
    }

    const costMap = new Map<string, { gross: number; net: number }>();
    for (const c of costRows) {
      costMap.set(c.estimateId, {
        gross: toFiniteNumber(c.costGross, 0),
        net: toFiniteNumber(c.costNet, 0),
      });
    }

    for (const id of estimateIds) {
      const rev = revMap.get(id) ?? { gross: 0, net: 0 };
      const cost = costMap.get(id) ?? { gross: 0, net: 0 };
      const profitExact = rev.net - cost.net;
      map.set(id, {
        revenueGross: Math.round(rev.gross),
        revenueNet: Math.round(rev.net),
        costGross: Math.round(cost.gross),
        costNet: Math.round(cost.net),
        profit: Math.round(profitExact),
        marginPercent:
          rev.net > 0 ? Number(((profitExact / rev.net) * 100).toFixed(2)) : 0,
      });
    }

    return map;
  }

  /**
   * Computes monthly canonical valued revenue, cost, and profit grouped in Vietnam timezone
   * (`Asia/Ho_Chi_Minh`) using strictly the latest approved estimate per dossier.
   */
  async getMonthlyFinancialTrend(
    params: MonthlyFinancialTrendParams,
  ): Promise<MonthlyFinancialPoint[]> {
    const {
      organizationId,
      year,
      allTime = false,
      timeZone = DEFAULT_BUSINESS_TIMEZONE,
    } = params;

    let { startUtc, endUtc } = params;
    if (!allTime && (!startUtc || !endUtc) && year) {
      const range = resolvePeriodRange('YEARLY', `${year}-01-01`, timeZone);
      startUtc = range.startUtc;
      endUtc = range.endUtc;
    }

    // Coalesce prevents allTime mode from dropping APPROVED estimates that lack approved_at
    const timestampCol = allTime
      ? 'COALESCE(estimate.approved_at, estimate.updated_at, estimate.created_at)'
      : 'estimate.approved_at';
    const monthExpr = zonedMonthKeySql(timestampCol, timeZone);

    const revQb = this.revenueLineRepository
      .createQueryBuilder('line')
      .innerJoin('line.estimate', 'estimate')
      .innerJoin('estimate.dossier', 'dossier')
      .select(monthExpr, 'monthKey')
      .addSelect(
        `COALESCE(SUM(${VALUED_REVENUE_NET_SQL('line')}), 0)`,
        'revenue',
      )
      .where('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('line.organizationId = :organizationId', { organizationId })
      .andWhere('estimate.status = :approvedEstimateStatus', {
        approvedEstimateStatus: EstimateStatus.APPROVED,
      })
      .andWhere(`estimate.id = ${LATEST_APPROVED_ESTIMATE_SUBQUERY}`, {
        organizationId,
        approvedEstimateStatus: EstimateStatus.APPROVED,
      })
      .groupBy(monthExpr);

    const costQb = this.costLineRepository
      .createQueryBuilder('line')
      .innerJoin('line.estimate', 'estimate')
      .innerJoin('estimate.dossier', 'dossier')
      .select(monthExpr, 'monthKey')
      .addSelect(`COALESCE(SUM(${VALUED_COST_NET_SQL('line')}), 0)`, 'cost')
      .where('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('line.organizationId = :organizationId', { organizationId })
      .andWhere('estimate.status = :approvedEstimateStatus', {
        approvedEstimateStatus: EstimateStatus.APPROVED,
      })
      .andWhere(`estimate.id = ${LATEST_APPROVED_ESTIMATE_SUBQUERY}`, {
        organizationId,
        approvedEstimateStatus: EstimateStatus.APPROVED,
      })
      .groupBy(monthExpr);

    if (!allTime && startUtc && endUtc) {
      revQb.andWhere('estimate.approvedAt BETWEEN :startUtc AND :endUtc', {
        startUtc,
        endUtc,
      });
      costQb.andWhere('estimate.approvedAt BETWEEN :startUtc AND :endUtc', {
        startUtc,
        endUtc,
      });
    } else if (!allTime && startUtc) {
      revQb.andWhere('estimate.approvedAt >= :startUtc', { startUtc });
      costQb.andWhere('estimate.approvedAt >= :startUtc', { startUtc });
    }

    const [revRows, costRows] = await Promise.all([
      revQb.getRawMany<{ monthKey: string; revenue: string | number }>(),
      costQb.getRawMany<{ monthKey: string; cost: string | number }>(),
    ]);

    const revMap = new Map<string, number>();
    for (const r of revRows) {
      if (r.monthKey) revMap.set(r.monthKey, toFiniteNumber(r.revenue, 0));
    }

    const costMap = new Map<string, number>();
    for (const c of costRows) {
      if (c.monthKey) costMap.set(c.monthKey, toFiniteNumber(c.cost, 0));
    }

    const monthKeys = Array.from(
      new Set([...revMap.keys(), ...costMap.keys()]),
    ).sort();

    return monthKeys.map((monthKey) => {
      const revExact = revMap.get(monthKey) ?? 0;
      const costExact = costMap.get(monthKey) ?? 0;
      return {
        monthKey,
        revenue: Math.round(revExact),
        cost: Math.round(costExact),
        profit: Math.round(revExact - costExact),
      };
    });
  }

  /**
   * Computes top customer canonical valued revenue grouped by `(customer.id, customer.displayName)`,
   * strictly counting the latest non-deleted APPROVED estimate per dossier.
   */
  async getTopCustomerRevenue(
    params: TopCustomerRevenueParams,
  ): Promise<TopCustomerRevenueItem[]> {
    const {
      organizationId,
      startUtc,
      endUtc,
      allTime = false,
      limit = 5,
    } = params;

    const qb = this.revenueLineRepository
      .createQueryBuilder('line')
      .select('customer.id', 'customerId')
      .addSelect('customer.displayName', 'customerName')
      .addSelect(
        `COALESCE(SUM(${VALUED_REVENUE_NET_SQL('line')}), 0)`,
        'spend',
      )
      .innerJoin('line.estimate', 'estimate')
      .innerJoin('estimate.dossier', 'dossier')
      .innerJoin('dossier.customer', 'customer')
      .where('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('line.organizationId = :organizationId', { organizationId })
      .andWhere('customer.organizationId = :organizationId', { organizationId })
      .andWhere('estimate.status = :approvedEstimateStatus', {
        approvedEstimateStatus: EstimateStatus.APPROVED,
      })
      .andWhere(`estimate.id = ${LATEST_APPROVED_ESTIMATE_SUBQUERY}`, {
        organizationId,
        approvedEstimateStatus: EstimateStatus.APPROVED,
      });

    if (!allTime && startUtc && endUtc) {
      qb.andWhere('estimate.approvedAt BETWEEN :startUtc AND :endUtc', {
        startUtc,
        endUtc,
      });
    }

    const rows = await qb
      .groupBy('customer.id')
      .addGroupBy('customer.displayName')
      .orderBy('spend', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map((row) => ({
      customerId: row.customerId,
      customerName: row.customerName,
      spend: Math.round(toFiniteNumber(row.spend, 0)),
    }));
  }

  /**
   * Computes canonical supplier spend summary (top-N + long-tail) used identically
   * by Operator Dashboard and CEO Dashboard, deduplicated to latest approved estimate per dossier.
   */
  async getSupplierSpendSummary(
    params: SupplierSpendQueryParams,
  ): Promise<SupplierSpendSummary> {
    const {
      organizationId,
      startUtc,
      endUtc,
      allTime = false,
      topLimit = 6,
      countableStatuses = DEFAULT_COUNTABLE_SUPPLIER_STATUSES,
    } = params;

    if (!countableStatuses || countableStatuses.length === 0) {
      return {
        totalSupplierSpend: 0,
        totalSupplierGrossSpend: 0,
        topSuppliersSpend: 0,
        otherSuppliersSpend: 0,
        totalSuppliersCount: 0,
        otherSuppliersCount: 0,
        topSuppliers: [],
      };
    }

    const applyPeriodFilter = !allTime && Boolean(startUtc && endUtc);
    const valuedCostExpr = VALUED_COST_NET_SQL('line');
    const grossCostExpr = WORKBOOK_GROSS_SQL('line');
    const periodCondition = applyPeriodFilter
      ? 'COALESCE(dossier.locked_at, dossier.updated_at) BETWEEN :lockedStart AND :lockedEnd'
      : 'TRUE';

    const baseParams: Record<string, any> = {
      organizationId,
      approvedEstimateStatus: EstimateStatus.APPROVED,
      countableStatuses,
      ...(applyPeriodFilter ? { lockedStart: startUtc, lockedEnd: endUtc } : {}),
    };

    const topQb = this.costLineRepository
      .createQueryBuilder('line')
      .innerJoin('line.estimate', 'estimate')
      .innerJoin('estimate.dossier', 'dossier')
      .innerJoin('line.supplier', 'supplier')
      .select('supplier.id', 'supplierId')
      .addSelect('supplier.code', 'supplierCode')
      .addSelect('supplier.name', 'supplierName')
      .addSelect(
        `COALESCE(SUM(CASE WHEN dossier.status IN (:...countableStatuses) AND ${periodCondition} THEN ${valuedCostExpr} ELSE 0 END), 0)`,
        'amount',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN dossier.status IN (:...countableStatuses) AND ${periodCondition} THEN ${grossCostExpr} ELSE 0 END), 0)`,
        'grossAmount',
      )
      .addSelect(
        `COUNT(DISTINCT CASE WHEN dossier.status IN (:...countableStatuses) AND ${periodCondition} THEN dossier.id ELSE NULL END)`,
        'dossierCount',
      )
      .where('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('line.organizationId = :organizationId', { organizationId })
      .andWhere('supplier.organizationId = :organizationId', { organizationId })
      .andWhere('estimate.status = :approvedEstimateStatus', {
        approvedEstimateStatus: EstimateStatus.APPROVED,
      })
      .andWhere(`estimate.id = ${LATEST_APPROVED_ESTIMATE_SUBQUERY}`, {
        organizationId,
        approvedEstimateStatus: EstimateStatus.APPROVED,
      })
      .setParameters(baseParams)
      .groupBy('supplier.id')
      .addGroupBy('supplier.code')
      .addGroupBy('supplier.name')
      .orderBy('amount', 'DESC')
      .limit(topLimit);

    const overallQb = this.costLineRepository
      .createQueryBuilder('line')
      .innerJoin('line.estimate', 'estimate')
      .innerJoin('estimate.dossier', 'dossier')
      .innerJoin('line.supplier', 'supplier')
      .select(
        `COALESCE(SUM(CASE WHEN dossier.status IN (:...countableStatuses) AND ${periodCondition} THEN ${valuedCostExpr} ELSE 0 END), 0)`,
        'totalSpend',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN dossier.status IN (:...countableStatuses) AND ${periodCondition} THEN ${grossCostExpr} ELSE 0 END), 0)`,
        'totalGrossSpend',
      )
      .addSelect(
        `COUNT(DISTINCT CASE WHEN dossier.status IN (:...countableStatuses) AND ${periodCondition} THEN supplier.id ELSE NULL END)`,
        'totalSuppliers',
      )
      .where('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('line.organizationId = :organizationId', { organizationId })
      .andWhere('supplier.organizationId = :organizationId', { organizationId })
      .andWhere('estimate.status = :approvedEstimateStatus', {
        approvedEstimateStatus: EstimateStatus.APPROVED,
      })
      .andWhere(`estimate.id = ${LATEST_APPROVED_ESTIMATE_SUBQUERY}`, {
        organizationId,
        approvedEstimateStatus: EstimateStatus.APPROVED,
      })
      .setParameters(baseParams);

    const [topRaw, overallRaw] = await Promise.all([
      topQb.getRawMany(),
      overallQb.getRawOne(),
    ]);

    const totalSupplierSpend = Math.round(
      toFiniteNumber(overallRaw?.totalSpend, 0),
    );
    const totalSupplierGrossSpend = Math.round(
      toFiniteNumber(overallRaw?.totalGrossSpend, 0),
    );
    const totalSuppliersCount = Math.round(
      toFiniteNumber(overallRaw?.totalSuppliers, 0),
    );

    const positiveTop = (topRaw || []).filter(
      (item) => toFiniteNumber(item.amount, 0) > 0,
    );

    const topSuppliers: SupplierSpendItem[] = positiveTop.map((item) => {
      const amount = Math.round(toFiniteNumber(item.amount, 0));
      const grossAmount = Math.round(toFiniteNumber(item.grossAmount, 0));
      const sharePercentage =
        totalSupplierSpend > 0
          ? Math.round((amount / totalSupplierSpend) * 1000) / 10
          : 0;
      return {
        supplierId: item.supplierId,
        supplierCode: item.supplierCode || '',
        supplierName: item.supplierName || '',
        amount,
        grossAmount,
        dossierCount: Math.round(toFiniteNumber(item.dossierCount, 0)),
        sharePercentage,
      };
    });

    const topSuppliersSpend = topSuppliers.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const otherSuppliersCount = Math.max(
      0,
      totalSuppliersCount - topSuppliers.length,
    );
    const otherSuppliersSpend =
      otherSuppliersCount === 0
        ? 0
        : Math.max(0, totalSupplierSpend - topSuppliersSpend);

    return {
      totalSupplierSpend,
      totalSupplierGrossSpend,
      topSuppliersSpend,
      otherSuppliersSpend,
      totalSuppliersCount,
      otherSuppliersCount,
      topSuppliers,
    };
  }

  /**
   * Computes canonical valued supplier spend per supplier ID for Suppliers list/detail,
   * strictly counting the latest non-deleted APPROVED estimate per dossier.
   */
  async getSupplierTotalsByIds(
    organizationId: string,
    supplierIds: string[],
    countableStatuses: DossierStatus[] = DEFAULT_COUNTABLE_SUPPLIER_STATUSES,
  ): Promise<Map<string, number>> {
    const totals = new Map<string, number>();
    if (
      !supplierIds ||
      supplierIds.length === 0 ||
      !countableStatuses ||
      countableStatuses.length === 0
    ) {
      return totals;
    }

    const rows = await this.costLineRepository
      .createQueryBuilder('line')
      .innerJoin('line.estimate', 'estimate')
      .innerJoin('estimate.dossier', 'dossier')
      .select('line.supplierId', 'supplierId')
      .addSelect(
        `COALESCE(SUM(CASE WHEN dossier.status IN (:...countableStatuses) THEN ${VALUED_COST_NET_SQL('line')} ELSE 0 END), 0)`,
        'totalAmount',
      )
      .where('line.supplierId IN (:...supplierIds)', { supplierIds })
      .andWhere('line.organizationId = :organizationId', { organizationId })
      .andWhere('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('estimate.status = :approvedEstimateStatus', {
        approvedEstimateStatus: EstimateStatus.APPROVED,
      })
      .andWhere(`estimate.id = ${LATEST_APPROVED_ESTIMATE_SUBQUERY}`, {
        organizationId,
        approvedEstimateStatus: EstimateStatus.APPROVED,
      })
      .setParameters({
        organizationId,
        approvedEstimateStatus: EstimateStatus.APPROVED,
        countableStatuses,
      })
      .groupBy('line.supplierId')
      .getRawMany();

    for (const row of rows) {
      totals.set(row.supplierId, Math.round(toFiniteNumber(row.totalAmount, 0)));
    }

    return totals;
  }

  /**
   * Computes canonical valued revenue, cost, and profit per sales user across
   * latest non-deleted APPROVED estimates.
   */
  async getSalesFinancialPerformance(
    organizationId: string,
  ): Promise<Map<string, SalesFinancialStats>> {
    const [revRows, costRows] = await Promise.all([
      this.revenueLineRepository
        .createQueryBuilder('line')
        .innerJoin('line.estimate', 'estimate')
        .innerJoin('estimate.dossier', 'dossier')
        .select('dossier.salesUserId', 'salesUserId')
        .addSelect(
          `COALESCE(SUM(${VALUED_REVENUE_NET_SQL('line')}), 0)`,
          'totalRevenue',
        )
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('line.organizationId = :organizationId', { organizationId })
        .andWhere('estimate.status = :approvedEstimateStatus', {
          approvedEstimateStatus: EstimateStatus.APPROVED,
        })
        .andWhere(`estimate.id = ${LATEST_APPROVED_ESTIMATE_SUBQUERY}`, {
          organizationId,
          approvedEstimateStatus: EstimateStatus.APPROVED,
        })
        .andWhere('dossier.salesUserId IS NOT NULL')
        .groupBy('dossier.salesUserId')
        .getRawMany(),
      this.costLineRepository
        .createQueryBuilder('line')
        .innerJoin('line.estimate', 'estimate')
        .innerJoin('estimate.dossier', 'dossier')
        .select('dossier.salesUserId', 'salesUserId')
        .addSelect(
          `COALESCE(SUM(${VALUED_COST_NET_SQL('line')}), 0)`,
          'totalCost',
        )
        .where('dossier.organizationId = :organizationId', { organizationId })
        .andWhere('line.organizationId = :organizationId', { organizationId })
        .andWhere('estimate.status = :approvedEstimateStatus', {
          approvedEstimateStatus: EstimateStatus.APPROVED,
        })
        .andWhere(`estimate.id = ${LATEST_APPROVED_ESTIMATE_SUBQUERY}`, {
          organizationId,
          approvedEstimateStatus: EstimateStatus.APPROVED,
        })
        .andWhere('dossier.salesUserId IS NOT NULL')
        .groupBy('dossier.salesUserId')
        .getRawMany(),
    ]);

    const revMap = new Map<string, number>();
    for (const r of revRows) {
      revMap.set(r.salesUserId, toFiniteNumber(r.totalRevenue, 0));
    }

    const costMap = new Map<string, number>();
    for (const c of costRows) {
      costMap.set(c.salesUserId, toFiniteNumber(c.totalCost, 0));
    }

    const result = new Map<string, SalesFinancialStats>();
    const userIds = new Set([...revMap.keys(), ...costMap.keys()]);
    for (const userId of userIds) {
      const rev = revMap.get(userId) ?? 0;
      const cost = costMap.get(userId) ?? 0;
      result.set(userId, {
        totalRevenue: Math.round(rev),
        totalCost: Math.round(cost),
        totalProfit: Math.round(rev - cost),
      });
    }

    return result;
  }

  /**
   * Computes canonical valued totals for an in-memory estimate whose lines are already loaded.
   */
  valuateLoadedEstimate(
    revenueLines: ValuationLineInput[] = [],
    costLines: ValuationLineInput[] = [],
  ): ValuedEstimateTotals {
    const summary = valuateEstimate(revenueLines, costLines);
    return {
      revenueGross: Math.round(summary.revenueGross),
      revenueNet: Math.round(summary.revenueNet),
      costGross: Math.round(summary.costGross),
      costNet: Math.round(summary.costNet),
      profit: summary.profit,
      marginPercent: summary.marginPercent,
    };
  }
}
