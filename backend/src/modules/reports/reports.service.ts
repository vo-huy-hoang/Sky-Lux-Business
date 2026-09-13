import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import * as XLSX from 'xlsx';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportExportDto } from './dto/report-export.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { SavedReport } from './entities/report.entity';
import {
  DossierStatus,
  EstimateStatus,
  PaymentDirection,
  PaymentStatus,
} from '../../common/enums';

type ReportScope = 'OWN' | 'TEAM' | 'ALL';

export interface ReportAccessContext {
  userId?: string;
  departmentId?: string;
  roles?: string[];
  permissions?: string[];
}

export interface ReportExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
  rowCount: number;
}

export interface FinancialSummary {
  revenueGross: number;
  revenueNet: number;
  costGross: number;
  costNet: number;
  profit: number;
  profitMargin: number;
  customerPaid?: number;
  customerOutstanding?: number;
}

const REPORT_CACHE_TTL_SECONDS = 300;
const APPROVED_ESTIMATE = EstimateStatus.APPROVED;

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(SavedReport)
    private readonly reportRepository: Repository<SavedReport>,
    @InjectRepository(Dossier)
    private readonly dossierRepository: Repository<Dossier>,
    @InjectRepository(EstimateCostLine)
    private readonly costLineRepository: Repository<EstimateCostLine>,
    @Optional()
    private readonly redisService?: RedisService,
  ) {}

  async getRevenueReport(
    organizationId: string,
    query: ReportQueryDto = new ReportQueryDto(),
    access?: ReportAccessContext,
  ) {
    return this.withCache('revenue', organizationId, query, access, () =>
      this.buildRevenueReport(organizationId, query, access, true),
    );
  }

  async getSalesPerformanceReport(
    organizationId: string,
    query: ReportQueryDto = new ReportQueryDto(),
    access?: ReportAccessContext,
  ) {
    return this.withCache(
      'sales-performance',
      organizationId,
      query,
      access,
      () =>
        this.buildSalesPerformanceReport(organizationId, query, access, true),
    );
  }

  async getCustomerReport(
    organizationId: string,
    query: ReportQueryDto = new ReportQueryDto(),
    access?: ReportAccessContext,
  ) {
    return this.withCache('customer', organizationId, query, access, () =>
      this.buildCustomerReport(organizationId, query, access, true),
    );
  }

  async getSupplierReport(
    organizationId: string,
    query: ReportQueryDto = new ReportQueryDto(),
    access?: ReportAccessContext,
  ) {
    return this.withCache('supplier', organizationId, query, access, () =>
      this.buildSupplierReport(organizationId, query, access, true),
    );
  }

  async exportReport(
    organizationId: string,
    userId: string,
    request: ReportExportDto,
    access?: ReportAccessContext,
  ): Promise<ReportExportResult> {
    const reportType = this.normalizeReportType(request.reportType);
    if (!['XLSX', 'CSV', 'PDF'].includes(request.format.toUpperCase())) {
      throw new BadRequestException('format phải là XLSX, CSV hoặc PDF');
    }
    const format = request.format.toUpperCase() as ReportExportDto['format'];
    const query = plainToInstance(ReportQueryDto, request.filters || {}, {
      enableImplicitConversion: true,
    });
    const filterErrors = validateSync(query, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (filterErrors.length > 0) {
      throw new BadRequestException('Bộ lọc báo cáo không hợp lệ');
    }
    query.page = 1;
    query.pageSize = 100;

    let report: { data: Record<string, unknown>[] };
    switch (reportType) {
      case 'revenue':
        report = await this.buildRevenueReport(
          organizationId,
          query,
          access || { userId },
          false,
        );
        break;
      case 'sales-performance':
        report = await this.buildSalesPerformanceReport(
          organizationId,
          query,
          access || { userId },
          false,
        );
        break;
      case 'customer':
        report = await this.buildCustomerReport(
          organizationId,
          query,
          access || { userId },
          false,
        );
        break;
      case 'supplier':
        report = await this.buildSupplierReport(
          organizationId,
          query,
          access || { userId },
          false,
        );
        break;
      default:
        throw new BadRequestException(
          'reportType phải là revenue, sales-performance, customer hoặc supplier',
        );
    }

    const rows = report.data;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = format.toLowerCase();
    let buffer: Buffer;
    let contentType: string;

    if (format === 'PDF') {
      buffer = this.createPdfBuffer(reportType, rows);
      contentType = 'application/pdf';
    } else {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
      buffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: format === 'CSV' ? 'csv' : 'xlsx',
      }) as Buffer;
      contentType =
        format === 'CSV'
          ? 'text/csv; charset=utf-8'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    return {
      buffer,
      contentType,
      filename: `skylux-${reportType}-${timestamp}.${extension}`,
      rowCount: rows.length,
    };
  }

  async create(
    organizationId: string,
    userId: string,
    createReportDto: CreateReportDto,
  ) {
    const report = this.reportRepository.create({
      ...createReportDto,
      organizationId,
      createdBy: userId,
      filters: createReportDto.filters || {},
      name: createReportDto.name.trim(),
      reportType: createReportDto.reportType.trim().toUpperCase(),
    });
    return { data: await this.reportRepository.save(report) };
  }

  async findAll(
    organizationId: string,
    query: ReportQueryDto = new ReportQueryDto(),
  ) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);
    const qb = this.reportRepository
      .createQueryBuilder('report')
      .where('report.organizationId = :organizationId', { organizationId });

    if (query.search?.trim()) {
      qb.andWhere(
        '(report.name ILIKE :search OR report.reportType ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    qb.orderBy('report.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async findOne(organizationId: string, id: string) {
    const report = await this.reportRepository.findOne({
      where: { id, organizationId },
    });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo đã lưu');
    return { data: report };
  }

  async update(
    organizationId: string,
    id: string,
    updateReportDto: UpdateReportDto,
  ) {
    const report = await this.reportRepository.findOne({
      where: { id, organizationId },
    });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo đã lưu');
    Object.assign(report, updateReportDto);
    if (updateReportDto.name) report.name = updateReportDto.name.trim();
    if (updateReportDto.reportType)
      report.reportType = updateReportDto.reportType.trim().toUpperCase();
    return { data: await this.reportRepository.save(report) };
  }

  async remove(organizationId: string, id: string) {
    const report = await this.reportRepository.findOne({
      where: { id, organizationId },
    });
    if (!report) throw new NotFoundException('Không tìm thấy báo cáo đã lưu');
    await this.reportRepository.softRemove(report);
    return { data: { deleted: true } };
  }

  private async buildRevenueReport(
    organizationId: string,
    query: ReportQueryDto,
    access: ReportAccessContext | undefined,
    paginate: boolean,
  ) {
    this.validatePeriod(query);
    const base = this.createDossierFinancialQuery(
      organizationId,
      query,
      access,
    );
    const revenueGross = this.lineSumSql(
      'estimate_revenue_lines',
      'gross_amount',
    );
    const revenueNet = this.lineSumSql('estimate_revenue_lines', 'net_amount');
    const costGross = this.lineSumSql('estimate_cost_lines', 'gross_amount');
    const costNet = this.lineSumSql('estimate_cost_lines', 'net_amount');
    const customerPaid = this.paymentSumSql(PaymentDirection.CUSTOMER_RECEIPT);

    const rowsQuery = base
      .select('dossier.id', 'dossierId')
      .addSelect('dossier.code', 'dossierCode')
      .addSelect('dossier.name', 'dossierName')
      .addSelect('customer.id', 'customerId')
      .addSelect('customer.displayName', 'customerName')
      .addSelect('dossier.salesUserId', 'salesUserId')
      .addSelect('salesUser.fullName', 'salesUserName')
      .addSelect('dossier.revenueRecognitionDate', 'revenueRecognitionDate')
      .addSelect('dossier.status', 'dossierStatus')
      .addSelect('estimate.currency', 'currency')
      .addSelect(revenueGross, 'revenueGross')
      .addSelect(revenueNet, 'revenueNet')
      .addSelect(costGross, 'costGross')
      .addSelect(costNet, 'costNet')
      .addSelect(customerPaid, 'customerPaid')
      .orderBy('dossier.revenueRecognitionDate', 'DESC', 'NULLS LAST')
      .addOrderBy('dossier.createdAt', 'DESC');

    if (paginate) this.applyPagination(rowsQuery, query);
    const [rawRows, total, summaryRaw] = await Promise.all([
      rowsQuery.getRawMany(),
      this.countDossiers(base),
      this.getFinancialSummary(
        base,
        revenueGross,
        revenueNet,
        costGross,
        costNet,
        customerPaid,
      ),
    ]);

    const data = rawRows.map((row) => this.mapFinancialRow(row));
    return {
      data,
      meta: this.reportMeta(query, total, this.mapSummary(summaryRaw)),
    };
  }

  private async buildSalesPerformanceReport(
    organizationId: string,
    query: ReportQueryDto,
    access: ReportAccessContext | undefined,
    paginate: boolean,
  ) {
    this.validatePeriod(query);
    const base = this.createDossierFinancialQuery(
      organizationId,
      query,
      access,
    ).andWhere('dossier.salesUserId IS NOT NULL');
    const revenueGross = this.lineSumSql(
      'estimate_revenue_lines',
      'gross_amount',
    );
    const revenueNet = this.lineSumSql('estimate_revenue_lines', 'net_amount');
    const costGross = this.lineSumSql('estimate_cost_lines', 'gross_amount');
    const costNet = this.lineSumSql('estimate_cost_lines', 'net_amount');

    const rowsQuery = base
      .select('salesUser.id', 'salesUserId')
      .addSelect('salesUser.employeeCode', 'employeeCode')
      .addSelect('salesUser.fullName', 'salesUserName')
      .addSelect('salesUser.email', 'salesUserEmail')
      .addSelect('salesUser.departmentId', 'departmentId')
      .addSelect('COUNT(DISTINCT dossier.id)', 'dossierCount')
      .addSelect(
        `COUNT(DISTINCT CASE WHEN dossier.status IN (:...successfulStatuses) THEN dossier.id END)`,
        'successfulDossierCount',
      )
      .addSelect(`SUM(${revenueGross})`, 'revenueGross')
      .addSelect(`SUM(${revenueNet})`, 'revenueNet')
      .addSelect(`SUM(${costGross})`, 'costGross')
      .addSelect(`SUM(${costNet})`, 'costNet')
      .setParameter('successfulStatuses', [
        DossierStatus.APPROVED,
        DossierStatus.COMPLETED,
      ])
      .groupBy('salesUser.id')
      .addGroupBy('salesUser.employeeCode')
      .addGroupBy('salesUser.fullName')
      .addGroupBy('salesUser.email')
      .addGroupBy('salesUser.departmentId')
      .orderBy('revenueNet', 'DESC');

    if (paginate) this.applyPagination(rowsQuery, query);
    const [rawRows, total, summaryRaw] = await Promise.all([
      rowsQuery.getRawMany(),
      this.countDistinct(base, 'salesUser.id'),
      this.getFinancialSummary(
        base,
        revenueGross,
        revenueNet,
        costGross,
        costNet,
      ),
    ]);

    const data = rawRows.map((row) => {
      const dossierCount = Number(row.dossierCount || 0);
      const successfulDossierCount = Number(row.successfulDossierCount || 0);
      return {
        salesUserId: row.salesUserId,
        employeeCode: row.employeeCode,
        salesUserName: row.salesUserName,
        salesUserEmail: row.salesUserEmail,
        departmentId: row.departmentId,
        dossierCount,
        successfulDossierCount,
        closeRate:
          dossierCount > 0
            ? Number(((successfulDossierCount / dossierCount) * 100).toFixed(2))
            : 0,
        ...this.mapSummary({
          revenueGross: row.revenueGross,
          revenueNet: row.revenueNet,
          costGross: row.costGross,
          costNet: row.costNet,
        }),
      };
    });

    return {
      data,
      meta: this.reportMeta(query, total, this.mapSummary(summaryRaw)),
    };
  }

  private async buildCustomerReport(
    organizationId: string,
    query: ReportQueryDto,
    access: ReportAccessContext | undefined,
    paginate: boolean,
  ) {
    this.validatePeriod(query);
    const base = this.createDossierFinancialQuery(
      organizationId,
      query,
      access,
    );
    const revenueGross = this.lineSumSql(
      'estimate_revenue_lines',
      'gross_amount',
    );
    const revenueNet = this.lineSumSql('estimate_revenue_lines', 'net_amount');
    const costGross = this.lineSumSql('estimate_cost_lines', 'gross_amount');
    const costNet = this.lineSumSql('estimate_cost_lines', 'net_amount');
    const customerPaid = this.paymentSumSql(PaymentDirection.CUSTOMER_RECEIPT);

    const rowsQuery = base
      .select('customer.id', 'customerId')
      .addSelect('customer.code', 'customerCode')
      .addSelect('customer.displayName', 'customerName')
      .addSelect('customer.customerType', 'customerType')
      .addSelect('COUNT(DISTINCT dossier.id)', 'dossierCount')
      .addSelect(`SUM(${revenueGross})`, 'revenueGross')
      .addSelect(`SUM(${revenueNet})`, 'revenueNet')
      .addSelect(`SUM(${costGross})`, 'costGross')
      .addSelect(`SUM(${costNet})`, 'costNet')
      .addSelect(`SUM(${customerPaid})`, 'customerPaid')
      .groupBy('customer.id')
      .addGroupBy('customer.code')
      .addGroupBy('customer.displayName')
      .addGroupBy('customer.customerType')
      .orderBy('revenueNet', 'DESC');

    if (paginate) this.applyPagination(rowsQuery, query);
    const countQuery = base
      .clone()
      .select('COUNT(DISTINCT customer.id)', 'count');
    const summaryQuery = base
      .clone()
      .select(`COALESCE(SUM(${revenueGross}), 0)`, 'revenueGross')
      .addSelect(`COALESCE(SUM(${revenueNet}), 0)`, 'revenueNet')
      .addSelect(`COALESCE(SUM(${costGross}), 0)`, 'costGross')
      .addSelect(`COALESCE(SUM(${costNet}), 0)`, 'costNet')
      .addSelect(`COALESCE(SUM(${customerPaid}), 0)`, 'customerPaid');
    const [rawRows, countRaw, summaryRaw] = await Promise.all([
      rowsQuery.getRawMany(),
      countQuery.getRawOne(),
      summaryQuery.getRawOne(),
    ]);

    const data = rawRows.map((row) => ({
      customerId: row.customerId,
      customerCode: row.customerCode,
      customerName: row.customerName,
      customerType: row.customerType,
      dossierCount: Number(row.dossierCount || 0),
      ...this.mapSummary(row),
    }));
    return {
      data,
      meta: this.reportMeta(
        query,
        Number(countRaw?.count || 0),
        this.mapSummary(summaryRaw),
      ),
    };
  }

  private async buildSupplierReport(
    organizationId: string,
    query: ReportQueryDto,
    access: ReportAccessContext | undefined,
    paginate: boolean,
  ) {
    this.validatePeriod(query);
    const base = this.createSupplierCostQuery(organizationId, query, access);
    const rowsQuery = base
      .select('supplier.id', 'supplierId')
      .addSelect('supplier.code', 'supplierCode')
      .addSelect('supplier.name', 'supplierName')
      .addSelect('supplier.status', 'supplierStatus')
      .addSelect('supplier.supplierTypeId', 'supplierTypeId')
      .addSelect('COUNT(DISTINCT dossier.id)', 'dossierCount')
      .addSelect('SUM(costLine.grossAmount)', 'costGross')
      .addSelect('SUM(costLine.netAmount)', 'costNet')
      .groupBy('supplier.id')
      .addGroupBy('supplier.code')
      .addGroupBy('supplier.name')
      .addGroupBy('supplier.status')
      .addGroupBy('supplier.supplierTypeId')
      .orderBy('costNet', 'DESC');

    if (paginate) this.applyPagination(rowsQuery, query);
    const countQuery = base
      .clone()
      .select('COUNT(DISTINCT supplier.id)', 'count');
    const summaryQuery = base
      .clone()
      .select('COALESCE(SUM(costLine.grossAmount), 0)', 'costGross')
      .addSelect('COALESCE(SUM(costLine.netAmount), 0)', 'costNet');
    const [rawRows, countRaw, summaryRaw] = await Promise.all([
      rowsQuery.getRawMany(),
      countQuery.getRawOne(),
      summaryQuery.getRawOne(),
    ]);

    const data = rawRows.map((row) => ({
      supplierId: row.supplierId,
      supplierCode: row.supplierCode,
      supplierName: row.supplierName,
      supplierStatus: row.supplierStatus,
      supplierTypeId: row.supplierTypeId,
      dossierCount: Number(row.dossierCount || 0),
      costGross: Number(row.costGross || 0),
      costNet: Number(row.costNet || 0),
    }));
    const costGross = Number(summaryRaw?.costGross || 0);
    const costNet = Number(summaryRaw?.costNet || 0);
    return {
      data,
      meta: this.reportMeta(query, Number(countRaw?.count || 0), {
        revenueGross: 0,
        revenueNet: 0,
        costGross,
        costNet,
        profit: -costNet,
        profitMargin: 0,
      }),
    };
  }

  private createDossierFinancialQuery(
    organizationId: string,
    query: ReportQueryDto,
    access?: ReportAccessContext,
  ): SelectQueryBuilder<any> {
    const qb = this.dossierRepository
      .createQueryBuilder('dossier')
      .leftJoin('dossier.customer', 'customer')
      .leftJoin('dossier.salesUser', 'salesUser')
      .innerJoin(
        'dossier.estimates',
        'estimate',
        `estimate.status = :approvedEstimateStatus
         AND estimate.id = (
           SELECT latest.id
           FROM estimates latest
           WHERE latest.dossier_id = dossier.id
             AND latest.organization_id = :organizationId
             AND latest.status = :approvedEstimateStatus
             AND latest.deleted_at IS NULL
           ORDER BY latest.version_no DESC, latest.approved_at DESC NULLS LAST, latest.created_at DESC
           LIMIT 1
         )`,
        { approvedEstimateStatus: APPROVED_ESTIMATE, organizationId },
      )
      .where('dossier.organizationId = :organizationId', { organizationId });

    this.applyDateFilter(qb, query);
    this.applyAccessFilter(qb, query, access);
    if (query.search?.trim()) {
      qb.andWhere(
        '(dossier.code ILIKE :reportSearch OR dossier.name ILIKE :reportSearch OR customer.displayName ILIKE :reportSearch OR salesUser.fullName ILIKE :reportSearch)',
        { reportSearch: `%${query.search.trim()}%` },
      );
    }
    return qb;
  }

  private createSupplierCostQuery(
    organizationId: string,
    query: ReportQueryDto,
    access?: ReportAccessContext,
  ): SelectQueryBuilder<any> {
    const qb = this.costLineRepository
      .createQueryBuilder('costLine')
      .innerJoin('costLine.estimate', 'estimate')
      .innerJoin('estimate.dossier', 'dossier')
      .innerJoin('costLine.supplier', 'supplier')
      .leftJoin('dossier.salesUser', 'salesUser')
      .where('costLine.organizationId = :organizationId', { organizationId })
      .andWhere('dossier.organizationId = :organizationId', { organizationId })
      .andWhere('estimate.status = :approvedEstimateStatus', {
        approvedEstimateStatus: APPROVED_ESTIMATE,
      })
      .andWhere(
        `estimate.id = (
          SELECT latest.id
          FROM estimates latest
          WHERE latest.dossier_id = dossier.id
            AND latest.organization_id = :organizationId
            AND latest.status = :approvedEstimateStatus
            AND latest.deleted_at IS NULL
          ORDER BY latest.version_no DESC, latest.approved_at DESC NULLS LAST, latest.created_at DESC
          LIMIT 1
        )`,
      );

    this.applyDateFilter(qb, query);
    this.applyAccessFilter(qb, query, access);
    if (query.search?.trim()) {
      qb.andWhere(
        '(supplier.code ILIKE :reportSearch OR supplier.name ILIKE :reportSearch)',
        { reportSearch: `%${query.search.trim()}%` },
      );
    }
    return qb;
  }

  private applyDateFilter(qb: SelectQueryBuilder<any>, query: ReportQueryDto) {
    if (query.periodStart && query.periodEnd) {
      qb.andWhere(
        'dossier.revenueRecognitionDate BETWEEN :periodStart AND :periodEnd',
        { periodStart: query.periodStart, periodEnd: query.periodEnd },
      );
    }
  }

  private applyAccessFilter(
    qb: SelectQueryBuilder<any>,
    query: ReportQueryDto,
    access?: ReportAccessContext,
  ) {
    const scope = this.resolveScope(access);
    if (scope === 'ALL') {
      if (query.userId) {
        qb.andWhere('salesUser.id = :requestedUserId', {
          requestedUserId: query.userId,
        });
      }
      if (query.departmentId) {
        qb.andWhere('salesUser.departmentId = :requestedDepartmentId', {
          requestedDepartmentId: query.departmentId,
        });
      }
      return;
    }

    if (scope === 'TEAM' && access?.departmentId) {
      qb.andWhere('salesUser.departmentId = :accessDepartmentId', {
        accessDepartmentId: access.departmentId,
      });
      if (query.userId) {
        qb.andWhere('salesUser.id = :requestedUserId', {
          requestedUserId: query.userId,
        });
      }
      if (query.departmentId) {
        qb.andWhere('salesUser.departmentId = :requestedDepartmentId', {
          requestedDepartmentId: query.departmentId,
        });
      }
      return;
    }

    if (access?.userId) {
      qb.andWhere('dossier.salesUserId = :accessUserId', {
        accessUserId: access.userId,
      });
    } else {
      // A scoped request without an authenticated user must never fall back to all data.
      qb.andWhere('1 = 0');
    }
  }

  private resolveScope(access?: ReportAccessContext): ReportScope {
    if (!access) return 'ALL';
    const roles = access.roles || [];
    const permissions = access.permissions || [];
    if (
      roles.some((role) =>
        ['SUPER_ADMIN', 'CEO_ADMIN', 'ACCOUNTANT'].includes(role),
      ) ||
      permissions.includes('report.view.all')
    ) {
      return 'ALL';
    }
    if (
      roles.includes('OPERATOR') ||
      permissions.includes('report.view.team') ||
      permissions.includes('dossier.view.team')
    ) {
      return 'TEAM';
    }
    return 'OWN';
  }

  private applyPagination(qb: SelectQueryBuilder<any>, query: ReportQueryDto) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);
    qb.skip((page - 1) * pageSize).take(pageSize);
  }

  private reportMeta(
    query: ReportQueryDto,
    total: number,
    summary: FinancialSummary,
  ) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || 20, 100);
    return {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      summary,
    };
  }

  private async countDossiers(qb: SelectQueryBuilder<any>) {
    const result = await qb
      .clone()
      .select('COUNT(DISTINCT dossier.id)', 'count')
      .getRawOne<{ count: string }>();
    return Number(result?.count || 0);
  }

  private async countDistinct(qb: SelectQueryBuilder<any>, column: string) {
    const result = await qb
      .clone()
      .select(`COUNT(DISTINCT ${column})`, 'count')
      .getRawOne<{ count: string }>();
    return Number(result?.count || 0);
  }

  private getFinancialSummary(
    qb: SelectQueryBuilder<any>,
    revenueGross: string,
    revenueNet: string,
    costGross: string,
    costNet: string,
    customerPaid?: string,
  ) {
    const summary = qb
      .clone()
      .select(`COALESCE(SUM(${revenueGross}), 0)`, 'revenueGross')
      .addSelect(`COALESCE(SUM(${revenueNet}), 0)`, 'revenueNet')
      .addSelect(`COALESCE(SUM(${costGross}), 0)`, 'costGross')
      .addSelect(`COALESCE(SUM(${costNet}), 0)`, 'costNet');
    if (customerPaid)
      summary.addSelect(`COALESCE(SUM(${customerPaid}), 0)`, 'customerPaid');
    return summary.getRawOne();
  }

  private lineSumSql(table: string, column: string) {
    return `(SELECT COALESCE(SUM(line_value.${column}), 0)
      FROM ${table} line_value
      WHERE line_value.estimate_id = estimate.id
        AND line_value.organization_id = :organizationId
        AND line_value.deleted_at IS NULL)`;
  }

  private paymentSumSql(direction: PaymentDirection) {
    return `(SELECT COALESCE(SUM(payment.amount), 0)
      FROM payments payment
      WHERE payment.dossier_id = dossier.id
        AND payment.organization_id = :organizationId
        AND payment.payment_direction = '${direction}'
        AND payment.status <> '${PaymentStatus.CANCELLED}'
        AND payment.deleted_at IS NULL)`;
  }

  private mapFinancialRow(row: Record<string, any>) {
    const summary = this.mapSummary(row);
    return {
      dossierId: row.dossierId,
      dossierCode: row.dossierCode,
      dossierName: row.dossierName,
      customerId: row.customerId,
      customerName: row.customerName,
      salesUserId: row.salesUserId,
      salesUserName: row.salesUserName,
      revenueRecognitionDate: row.revenueRecognitionDate,
      dossierStatus: row.dossierStatus,
      currency: row.currency,
      ...summary,
    };
  }

  private mapSummary(row?: Record<string, any>): FinancialSummary {
    const revenueGross = Number(row?.revenueGross || 0);
    const revenueNet = Number(row?.revenueNet || 0);
    const costGross = Number(row?.costGross || 0);
    const costNet = Number(row?.costNet || 0);
    const customerPaid = Number(row?.customerPaid || 0);
    const profit = revenueNet - costNet;
    return {
      revenueGross,
      revenueNet,
      costGross,
      costNet,
      profit,
      profitMargin:
        revenueNet > 0 ? Number(((profit / revenueNet) * 100).toFixed(2)) : 0,
      ...(row?.customerPaid !== undefined
        ? {
            customerPaid,
            customerOutstanding: Math.max(revenueNet - customerPaid, 0),
          }
        : {}),
    };
  }

  private validatePeriod(query: ReportQueryDto) {
    if (
      query.periodStart &&
      query.periodEnd &&
      query.periodStart > query.periodEnd
    ) {
      throw new BadRequestException('periodStart không được lớn hơn periodEnd');
    }
  }

  private normalizeReportType(reportType: string) {
    const normalized = reportType.trim().toLowerCase().replace(/_/g, '-');
    if (normalized === 'salesperformance') return 'sales-performance';
    return normalized;
  }

  private async withCache<T>(
    reportType: string,
    organizationId: string,
    query: ReportQueryDto,
    access: ReportAccessContext | undefined,
    factory: () => Promise<T>,
  ): Promise<T> {
    const scope = this.resolveScope(access);
    const cacheKey = [
      'skylux:reports',
      reportType,
      organizationId,
      access?.userId || 'system',
      scope,
      JSON.stringify({
        periodStart: query.periodStart,
        periodEnd: query.periodEnd,
        departmentId: query.departmentId,
        userId: query.userId,
        page: query.page || 1,
        pageSize: query.pageSize || 20,
        search: query.search?.trim() || '',
      }),
    ].join(':');
    const cached = await this.redisService?.get<T>(cacheKey);
    if (cached) return cached;
    const result = await factory();
    await this.redisService?.set(cacheKey, result, REPORT_CACHE_TTL_SECONDS);
    return result;
  }

  private createPdfBuffer(reportType: string, rows: Record<string, unknown>[]) {
    const title = `Sky-Lux CRM - ${reportType} report`;
    const lines = [title, `Rows: ${rows.length}`];
    for (const row of rows) {
      lines.push(
        Object.values(row)
          .map((value) => this.toPdfText(value))
          .join(' | '),
      );
    }

    const linesPerPage = 45;
    const pageLines = Array.from(
      { length: Math.max(1, Math.ceil(lines.length / linesPerPage)) },
      (_, index) =>
        lines.slice(index * linesPerPage, (index + 1) * linesPerPage),
    );
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];
    const pageObjectIds: number[] = [];
    for (const page of pageLines) {
      const pageObjectId = objects.length + 1;
      const contentObjectId = pageObjectId + 1;
      const textCommands = page
        .map(
          (line, index) =>
            `1 0 0 1 36 ${800 - index * 16} Tm (${this.escapePdf(line)}) Tj`,
        )
        .join('\n');
      const content = `BT /F1 8 Tf\n${textCommands}\nET`;
      pageObjectIds.push(pageObjectId);
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
        `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream`,
      );
    }
    objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets[index + 1] = Buffer.byteLength(pdf, 'ascii');
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(pdf, 'ascii');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let index = 1; index <= objects.length; index++) {
      pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'ascii');
  }

  private toPdfText(value: unknown) {
    const text =
      value === null || value === undefined
        ? ''
        : typeof value === 'string'
          ? value
          : (JSON.stringify(value) ?? '');
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '?');
  }

  private escapePdf(value: string) {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }
}
