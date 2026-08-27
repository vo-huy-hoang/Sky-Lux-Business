import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryMyKpiDto } from './dto/query-my-kpi.dto';
import { KpiTarget } from './entities/kpi-target.entity';
import { KpiResult } from './entities/kpi-result.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import {
  KpiMetric,
  KpiPeriodType,
  DossierStatus,
  EstimateStatus,
} from '../../common/enums';

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
  ) {}

  async findMyKpi(
    organizationId: string,
    userId: string,
    queryDto: QueryMyKpiDto,
  ) {
    const periodType = queryDto.periodType || KpiPeriodType.MONTHLY;
    const { periodStart, periodEnd } = this.getPeriodDates(periodType, queryDto.date);

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
          actualValue = await this.calculateLiveRevenue(organizationId, userId, periodStart, periodEnd);
          break;
        case KpiMetric.PROFIT:
          actualValue = await this.calculateLiveProfit(organizationId, userId, periodStart, periodEnd);
          break;
        case KpiMetric.DOSSIER_COUNT:
          actualValue = await this.calculateLiveDossierCount(organizationId, userId, periodStart, periodEnd);
          break;
        case KpiMetric.CLOSE_RATE:
          actualValue = await this.calculateLiveCloseRate(organizationId, userId, periodStart, periodEnd);
          break;
      }

      // Compute achievementRate
      const targetVal = Number(target.targetValue) || 0;
      const achievementRate = targetVal > 0 ? Number(((actualValue / targetVal) * 100).toFixed(2)) : 0;

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

    return resultsList;
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

  private async getApprovedEstimates(
    organizationId: string,
    userId: string,
    start: string,
    end: string,
  ): Promise<Estimate[]> {
    return this.estimateRepository.createQueryBuilder('estimate')
      .innerJoin('estimate.dossier', 'dossier')
      .where('dossier.salesUserId = :userId', { userId })
      .andWhere('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('estimate.status = :status', { status: EstimateStatus.APPROVED })
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
    const approvedEstimates = await this.getApprovedEstimates(organizationId, userId, start, end);

    if (approvedEstimates.length === 0) {
      return 0;
    }

    const estimateIds = approvedEstimates.map((e) => e.id);
    const sumResult = await this.revenueLineRepository.createQueryBuilder('line')
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
    const approvedEstimates = await this.getApprovedEstimates(organizationId, userId, start, end);

    if (approvedEstimates.length === 0) {
      return 0;
    }

    const estimateIds = approvedEstimates.map((e) => e.id);

    const revenueSumResult = await this.revenueLineRepository.createQueryBuilder('line')
      .select('SUM(line.netAmount)', 'sum')
      .where('line.estimateId IN (:...estimateIds)', { estimateIds })
      .getRawOne();

    const costSumResult = await this.costLineRepository.createQueryBuilder('line')
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
    return this.dossierRepository.createQueryBuilder('dossier')
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
    const totalAssigned = await this.dossierRepository.createQueryBuilder('dossier')
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

    const wonCount = await this.calculateLiveDossierCount(organizationId, userId, start, end);

    return Number(((wonCount / totalAssigned) * 100).toFixed(2));
  }
}
