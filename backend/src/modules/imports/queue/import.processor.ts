import { Optional, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as xlsx from 'xlsx';

import { ImportSession } from '../entities/import-session.entity';
import { ImportRow } from '../entities/import-row.entity';
import { ImportError } from '../entities/import-error.entity';
import { ImportSessionStatus } from '../../../common/enums';
import { Customer } from '../../customers/entities/customer.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { Dossier } from '../../dossiers/entities/dossier.entity';
import {
  CUSTOMER_BUDGET_FORMAT,
  computeFinancialReconciliation,
  findCustomerBudgetSheet,
  isCustomerBudgetWorkbook,
  looksLikeCustomerBudgetWorkbook,
  parseCustomerBudgetWorkbook,
} from '../customer-budget.parser';
import {
  CustomerIdentity,
  CustomerIdentityIndex,
  normalizeCustomerPhone,
  normalizeCustomerEmail,
} from './customer-identity-index';

function sanitizeCellValue(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (['=', '+', '-', '@'].some((prefix) => str.startsWith(prefix))) {
    return `'${str}`;
  }
  return str;
}

@Processor('import-queue')
export class ImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportProcessor.name);

  constructor(
    @InjectRepository(ImportSession)
    private readonly sessionRepository: Repository<ImportSession>,
    @InjectRepository(ImportRow)
    private readonly rowRepository: Repository<ImportRow>,
    @InjectRepository(ImportError)
    private readonly errorRepository: Repository<ImportError>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @Optional()
    @InjectRepository(Supplier)
    private readonly supplierRepository?: Repository<Supplier>,
    @Optional()
    @InjectRepository(Dossier)
    private readonly dossierRepository?: Repository<Dossier>,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const { sessionId } = job.data;

    try {
      if (job.name === 'parse-excel') {
        await this.handleParseExcel(job);
      } else if (job.name === 'validate-rows') {
        await this.handleValidateRows(sessionId);
      }
    } catch (error) {
      // Log errors to session
      await this.sessionRepository.update(sessionId, {
        status: ImportSessionStatus.FAILED,
        summary: { error: error.message },
      });
      throw error;
    }
  }

  private async handleParseExcel(job: Job<any>) {
    const { sessionId, filePath } = job.data;

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) return;

    // Update status to PROCESSING
    await this.sessionRepository.update(sessionId, {
      status: ImportSessionStatus.PROCESSING,
    });

    // Parse Excel File
    if (!fs.existsSync(filePath)) {
      throw new Error(`Không tìm thấy tệp tin Excel tại: ${filePath}`);
    }

    const workbook = xlsx.readFile(filePath, { cellDates: true });
    const detectedBudgetSheet = findCustomerBudgetSheet(workbook);
    const sheetName =
      detectedBudgetSheet || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    let rowsData: any[] = [];
    let budgetParsingError: string | null = null;
    const isBudgetCandidate = looksLikeCustomerBudgetWorkbook(workbook);

    if (isBudgetCandidate) {
      try {
        rowsData = [parseCustomerBudgetWorkbook(workbook)];
      } catch (err: any) {
        budgetParsingError =
          err?.message || 'Cấu trúc file Dự toán không hợp lệ';
      }
    } else {
      rowsData = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    }

    // Clear existing raw rows in staging
    await this.rowRepository.delete({ sessionId });
    await this.errorRepository.delete({ sessionId });

    if (budgetParsingError) {
      const errorRow = this.rowRepository.create({
        sessionId,
        sheetName,
        rowNumber: 1,
        rawData: { error: budgetParsingError },
        status: 'ERROR',
        normalizedData: undefined,
      });
      await this.rowRepository.save(errorRow);

      const errorEntity = this.errorRepository.create({
        sessionId,
        rowNumber: 1,
        errorCode: 'BUDGET_FORMAT_ERROR',
        errorMessage: budgetParsingError,
      });
      await this.errorRepository.save(errorEntity);

      try {
        fs.unlinkSync(filePath);
      } catch (e) {}

      await this.sessionRepository.update(sessionId, {
        status: ImportSessionStatus.READY_FOR_REVIEW,
        totalRows: 1,
        processedRows: 1,
        validRows: 0,
        errorRows: 1,
      });
      return;
    }

    // Save staging records
    const importRows = rowsData.map((data, index) => {
      return this.rowRepository.create({
        sessionId,
        sheetName,
        rowNumber: isBudgetCandidate ? 1 : index + 2,
        rawData: data,
        status: 'PENDING',
      });
    });

    await this.rowRepository.save(importRows);

    // Clean up temporary local file
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      // Ignore cleanup error
    }

    // Update session status to READY_FOR_REVIEW
    await this.sessionRepository.update(sessionId, {
      status: ImportSessionStatus.READY_FOR_REVIEW,
      totalRows: importRows.length,
    });

    // Auto-trigger validation
    await this.handleValidateRows(sessionId);
  }

  private async handleValidateRows(sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { template: true },
    });

    if (!session) return;

    // Update status to PROCESSING
    await this.sessionRepository.update(sessionId, {
      status: ImportSessionStatus.PROCESSING,
    });

    // Delete existing errors for session
    await this.errorRepository.delete({ sessionId });

    // Fetch all staging rows
    const rows = await this.rowRepository.find({
      where: { sessionId },
      order: { rowNumber: 'ASC' },
    });

    const hasCustomerBudgetRows = rows.some(
      (row) => row.rawData?.__importFormat === CUSTOMER_BUDGET_FORMAT,
    );
    const identityCandidates: CustomerIdentity[] = hasCustomerBudgetRows
      ? await this.customerRepository.find({
          where: { organizationId: session.organizationId },
          order: { createdAt: 'ASC' },
        })
      : [];
    const identityIndex = new CustomerIdentityIndex(identityCandidates);

    let validRowsCount = 0;
    let errorRowsCount = 0;
    let warningRowsCount = 0;

    const mapping = session.template?.mappingConfig || {};
    const codeKey = mapping.codeColumn || 'Mã hồ sơ';
    const nameKey = mapping.nameColumn || 'Tên hồ sơ';
    const customerKey = mapping.customerColumn || 'Mã khách hàng';
    const startDateKey = mapping.startDateColumn || 'Ngày bắt đầu';
    const endDateKey = mapping.endDateColumn || 'Ngày kết thúc';
    const routeKey = mapping.routeColumn || 'Tuyến đường';
    const priorityKey = mapping.priorityColumn || 'Mức độ ưu tiên';

    const customerNameKey = mapping.customerNameColumn || 'Tên khách hàng';
    const phoneKey = mapping.phoneColumn || 'Số điện thoại';
    const emailKey = mapping.emailColumn || 'Email';
    const dobKey =
      mapping.dobColumn || mapping.birthDateColumn || 'Ngày sinh nhật';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9+\s().-]{8,20}$/;

    for (const row of rows) {
      const errors: string[] = [];
      const data = row.rawData;

      const isCustomerBudget = data.__importFormat === CUSTOMER_BUDGET_FORMAT;

      // 1. Basic validation rules for Dossier import
      const code = String(data[codeKey] || '').trim();
      const name = String(data[nameKey] || '').trim();
      const customerCode = String(data[customerKey] || '').trim();
      const startDate = String(data[startDateKey] || '').trim();
      const endDate = String(data[endDateKey] || '').trim();

      // Additional customer info fields if present in Excel
      const customerName = String(
        data[customerNameKey] !== undefined
          ? data[customerNameKey]
          : data['Tên khách hàng'] || '',
      ).trim();
      const phone = String(
        data[phoneKey] !== undefined
          ? data[phoneKey]
          : data['Số điện thoại'] || data['Số ĐT'] || '',
      ).trim();
      const email = String(
        data[emailKey] !== undefined ? data[emailKey] : data['Email'] || '',
      ).trim();
      const dob = String(
        data[dobKey] !== undefined
          ? data[dobKey]
          : data['Ngày sinh nhật'] || data['Ngày sinh'] || '',
      ).trim();
      const identityConflict = isCustomerBudget
        ? identityIndex.checkConflict(phone, email, customerName)
        : null;
      if (identityConflict) errors.push(identityConflict);
      if (!name) {
        errors.push(`${nameKey} không được để trống`);
      }
      if (!customerCode && !isCustomerBudget) {
        errors.push(`${customerKey} không được để trống`);
      }
      if (isCustomerBudget && !customerName) {
        errors.push(`${customerNameKey} không được để trống`);
      }

      // Customer fields validation
      if (email && !emailRegex.test(email)) {
        errors.push(`${emailKey} không đúng định dạng email`);
      }

      if (phone && !phoneRegex.test(phone)) {
        errors.push(`${phoneKey} không đúng định dạng số điện thoại`);
      }

      if (dob) {
        const parsedDob = Date.parse(dob);
        if (isNaN(parsedDob)) {
          errors.push(`${dobKey} không đúng định dạng ngày hợp lệ`);
        } else if (new Date(dob) > new Date()) {
          errors.push(`${dobKey} không thể lớn hơn ngày hiện tại`);
        }
      }

      // Check customer exist in organization (strictly read-only validation)
      let customer: Customer | null = null;
      let customerStatus: 'EXISTING' | 'NEW_TO_BE_CREATED' = 'NEW_TO_BE_CREATED';
      if (customerCode) {
        customer = await this.customerRepository.findOne({
          where: { code: customerCode, organizationId: session.organizationId },
        });
        if (customer) {
          customerStatus = 'EXISTING';
        } else {
          customerStatus = 'NEW_TO_BE_CREATED';
        }
      } else if (isCustomerBudget && (phone || email)) {
        const phoneMatches = phone ? identityIndex.getPhoneMatches(phone) : [];
        const emailMatches = email ? identityIndex.getEmailMatches(email) : [];
        const matched = phoneMatches[0] || emailMatches[0];
        if (matched) {
          const isExistingMaster = !matched.id.startsWith('import-');
          if (isExistingMaster) {
            customer = matched as any;
            customerStatus = 'EXISTING';
          } else {
            customerStatus = 'NEW_TO_BE_CREATED';
          }
        } else {
          customerStatus = 'NEW_TO_BE_CREATED';
        }
      }

      const effectiveCustomerName =
        customer?.displayName ||
        customerName ||
        (customerCode ? `Khách hàng ${customerCode}` : '');

      // Date parsing & logical order validation
      let validStartDate = false;
      let validEndDate = false;
      if (startDate) {
        if (isNaN(Date.parse(startDate))) {
          errors.push(`${startDateKey} không đúng định dạng YYYY-MM-DD`);
        } else {
          validStartDate = true;
        }
      }
      if (endDate) {
        if (isNaN(Date.parse(endDate))) {
          errors.push(`${endDateKey} không đúng định dạng YYYY-MM-DD`);
        } else {
          validEndDate = true;
        }
      }
      if (validStartDate && validEndDate) {
        if (new Date(startDate) > new Date(endDate)) {
          errors.push(
            `${endDateKey} (${endDate}) không thể trước ${startDateKey} (${startDate})`,
          );
        }
      }

      if (errors.length > 0) {
        // Save errors
        errorRowsCount++;
        row.status = 'ERROR';
        row.normalizedData = null as any;

        const errorEntities = errors.map((msg) =>
          this.errorRepository.create({
            sessionId,
            rowNumber: row.rowNumber,
            errorCode: 'VALIDATION_FAILED',
            errorMessage: msg,
          }),
        );
        await this.errorRepository.save(errorEntities);
      } else {
        if (
          isCustomerBudget &&
          (phone || email) &&
          !identityIndex.hasExactIdentity(phone, email)
        ) {
          identityIndex.addCandidate({
            id: `import-${row.id}`,
            displayName: customerName,
            phone,
            email,
          });
        }

        // Save normalized data structure for Dossier & Customer migration (with formula sanitization)
        validRowsCount++;
        row.status = 'VALID';

        let supplierResolution: Array<{
          name: string;
          status: 'EXISTING' | 'NEW_TO_BE_CREATED';
          id?: string;
        }> = [];

        if (
          isCustomerBudget &&
          data.__costLines &&
          Array.isArray(data.__costLines)
        ) {
          const rawSupplierNames = Array.from(
            new Set(
              data.__costLines
                .map((l: any) => String(l.supplierName || '').trim())
                .filter(Boolean),
            ),
          ) as string[];

          if (rawSupplierNames.length > 0 && this.supplierRepository) {
            try {
              const existingSuppliers = await this.supplierRepository.find({
                where: { organizationId: session.organizationId },
              });
              const existingMap = new Map(
                existingSuppliers.map((s) => [
                  s.name.trim().toLowerCase(),
                  s.id,
                ]),
              );
              supplierResolution = rawSupplierNames.map((name) => {
                const existingId = existingMap.get(name.toLowerCase());
                return {
                  name,
                  status: existingId ? 'EXISTING' : 'NEW_TO_BE_CREATED',
                  ...(existingId ? { id: existingId } : {}),
                };
              });
            } catch (supErr) {
              supplierResolution = rawSupplierNames.map((name) => ({
                name,
                status: 'NEW_TO_BE_CREATED',
              }));
            }
          } else if (rawSupplierNames.length > 0) {
            supplierResolution = rawSupplierNames.map((name) => ({
              name,
              status: 'NEW_TO_BE_CREATED',
            }));
          }
        }

        const parseIsoDate = (dateVal: string): string | undefined => {
          if (!dateVal) return undefined;
          const parsed = Date.parse(dateVal);
          if (!isNaN(parsed)) {
            return new Date(dateVal).toISOString().slice(0, 10);
          }
          if (/^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
            return dateVal.slice(0, 10);
          }
          return undefined;
        };

        const normalizedStartDate = parseIsoDate(startDate);
        const normalizedEndDate = parseIsoDate(endDate);

        // Check duplicate with active dossiers (deletedAt IS NULL)
        let duplicateWarning: {
          type: 'DUPLICATE_ACTIVE_DOSSIER';
          existingDossierId: string;
          existingDossierCode: string;
          message: string;
        } | null = null;

        if (this.dossierRepository) {
          try {
            let matchingDossier: Dossier | null = null;

            // Layer 1: Check match by dossier code
            if (code) {
              matchingDossier = await this.dossierRepository.findOne({
                where: {
                  organizationId: session.organizationId,
                  code,
                },
              });
            }

            // Layer 2: Check matching customer + startDate + route
            const normalizedRoute = String(data[routeKey] || '').trim();
            if (
              !matchingDossier &&
              (customer?.id || effectiveCustomerName) &&
              normalizedStartDate &&
              normalizedRoute
            ) {
              const query = this.dossierRepository
                .createQueryBuilder('dossier')
                .where('dossier.organizationId = :organizationId', {
                  organizationId: session.organizationId,
                })
                .andWhere('dossier.startDate = :startDate', {
                  startDate: normalizedStartDate,
                })
                .andWhere('dossier.route ILIKE :route', {
                  route: `%${normalizedRoute}%`,
                });

              if (customer?.id) {
                query.andWhere('dossier.customerId = :customerId', {
                  customerId: customer.id,
                });
              } else if (effectiveCustomerName) {
                query.andWhere('dossier.customerName ILIKE :custName', {
                  custName: `%${effectiveCustomerName}%`,
                });
              }

              matchingDossier = await query.getOne();
            }

            if (matchingDossier) {
              duplicateWarning = {
                type: 'DUPLICATE_ACTIVE_DOSSIER',
                existingDossierId: matchingDossier.id,
                existingDossierCode: matchingDossier.code,
                message: `Hồ sơ có nguy cơ trùng lặp với hồ sơ đang hoạt động [Mã: ${matchingDossier.code} - ${matchingDossier.name}].`,
              };
            }
          } catch (err: any) {
            this.logger.warn(
              `Lỗi đối soát trùng lặp hồ sơ import: ${err?.message}`,
            );
          }
        }

        const rowWarnings = duplicateWarning ? [duplicateWarning] : [];
        if (rowWarnings.length > 0) {
          warningRowsCount++;
        }

        row.normalizedData = {
          code: sanitizeCellValue(code),
          name: sanitizeCellValue(name),
          customerId: customer?.id || undefined,
          customerStatus,
          customerCode: customer?.code || customerCode || undefined,
          customerResolution: {
            status: customerStatus,
            ...(customer?.id ? { id: customer.id } : {}),
            code: customer?.code || customerCode || undefined,
            name: effectiveCustomerName || undefined,
          },
          route: sanitizeCellValue(String(data[routeKey] || '').trim()),
          startDate: normalizedStartDate,
          endDate: normalizedEndDate,
          warnings: rowWarnings,
          hasWarning: rowWarnings.length > 0,
          ...(isCustomerBudget && data.tourDuration
            ? {
                tourDuration: sanitizeCellValue(
                  String(data.tourDuration).trim(),
                ),
              }
            : {}),
          priority: data[priorityKey] || 'MEDIUM',
          ...(effectiveCustomerName
            ? { customerName: sanitizeCellValue(effectiveCustomerName) }
            : {}),
          ...(phone ? { phone: sanitizeCellValue(phone) } : {}),
          ...(email ? { email: sanitizeCellValue(email) } : {}),
          ...(dob && !isNaN(Date.parse(dob))
            ? { dateOfBirth: new Date(dob).toISOString().slice(0, 10) }
            : {}),
          ...(isCustomerBudget
            ? {
                importFormat: CUSTOMER_BUDGET_FORMAT,
                businessLineCode: data.__businessLineCode,
                businessLineName: data.__businessLineName,
                marketTypeCode: data.__marketTypeCode,
                marketTypeName: data.__marketTypeName,
                revenueLines: data.__revenueLines,
                costLines: data.__costLines,
                sourceSummary: data.__sourceSummary,
                financialReconciliation: computeFinancialReconciliation(
                  data.__revenueLines || [],
                  data.__costLines || [],
                  data.__sourceSummary,
                ),
                reconciliationResolution: data.__reconciliationResolution,
                supplierResolution,
              }
            : {}),
        };
      }

      await this.rowRepository.save(row);
    }

    // Update session status and counts
    await this.sessionRepository.update(sessionId, {
      status: ImportSessionStatus.READY_FOR_REVIEW,
      processedRows: rows.length,
      validRows: validRowsCount,
      errorRows: errorRowsCount,
      summary: {
        ...(session.summary || {}),
        warningRows: warningRowsCount,
      } as any,
    });
  }
}
