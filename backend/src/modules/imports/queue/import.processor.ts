import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as xlsx from 'xlsx';

import { ImportSession } from '../entities/import-session.entity';
import { ImportRow } from '../entities/import-row.entity';
import { ImportError } from '../entities/import-error.entity';
import { ImportSessionStatus, CustomerType } from '../../../common/enums';
import { Customer } from '../../customers/entities/customer.entity';
import { Dossier } from '../../dossiers/entities/dossier.entity';
import {
  CUSTOMER_BUDGET_FORMAT,
  isCustomerBudgetWorkbook,
  parseCustomerBudgetWorkbook,
} from '../customer-budget.parser';

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
  constructor(
    @InjectRepository(ImportSession)
    private readonly sessionRepository: Repository<ImportSession>,
    @InjectRepository(ImportRow)
    private readonly rowRepository: Repository<ImportRow>,
    @InjectRepository(ImportError)
    private readonly errorRepository: Repository<ImportError>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Dossier)
    private readonly dossierRepository: Repository<Dossier>,
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
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Read sheet to JSON format with empty string default values
    const rowsData: any[] = isCustomerBudgetWorkbook(workbook)
      ? [parseCustomerBudgetWorkbook(workbook)]
      : xlsx.utils.sheet_to_json(sheet, { defval: '' });

    // Clear existing raw rows in staging
    await this.rowRepository.delete({ sessionId });
    await this.errorRepository.delete({ sessionId });

    // Save staging records
    const importRows = rowsData.map((data, index) => {
      return this.rowRepository.create({
        sessionId,
        sheetName,
        rowNumber: isCustomerBudgetWorkbook(workbook) ? 1 : index + 2,
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

    let validRowsCount = 0;
    let errorRowsCount = 0;

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

    // Track codes across rows in the same file to detect internal duplicates
    const codeOccurrences = new Map<string, number[]>();
    for (const r of rows) {
      const c = String(r.rawData?.[codeKey] || '').trim();
      if (c) {
        if (!codeOccurrences.has(c)) {
          codeOccurrences.set(c, []);
        }
        codeOccurrences.get(c)!.push(r.rowNumber);
      }
    }

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

      if (!code) {
        errors.push(`${codeKey} không được để trống`);
      } else if ((codeOccurrences.get(code)?.length ?? 0) > 1) {
        errors.push(
          `${codeKey} "${code}" bị trùng lặp tại các dòng: ${codeOccurrences.get(code)!.join(', ')} trong tệp tin`,
        );
      } else {
        const existingDossier = await this.dossierRepository.findOne({
          where: { code, organizationId: session.organizationId },
          relations: { customer: true },
        });
        if (existingDossier) {
          const cName = existingDossier.customer?.displayName || customerName || '';
          errors.push(`Đã tồn tại file dự toán này của khách hàng ${cName}`.trim());
        }
      }

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

      // Check customer exist in organization, or auto-create if new
      let customer: Customer | null = null;
      if (customerCode) {
        customer = await this.customerRepository.findOne({
          where: { code: customerCode, organizationId: session.organizationId },
        });
        if (!customer) {
          // Tự động tạo mới khách hàng từ thông tin trong file Excel
          try {
            const nameToUse = customerName || `Khách hàng ${customerCode}`;
            const newCustomer = this.customerRepository.create({
              organizationId: session.organizationId,
              code: customerCode,
              displayName: nameToUse,
              customerType: CustomerType.INDIVIDUAL,
              phone: phone || undefined,
              email: email || undefined,
              dateOfBirth:
                dob && !isNaN(Date.parse(dob))
                  ? new Date(dob).toISOString().slice(0, 10)
                  : undefined,
              status: 'ACTIVE',
            });
            customer = await this.customerRepository.save(newCustomer);
          } catch (createErr: any) {
            errors.push(
              `Không thể tự động tạo mới khách hàng "${customerCode}": ${createErr?.message || 'Lỗi lưu dữ liệu'}`,
            );
          }
        }
      } else if (isCustomerBudget) {
        if (email) {
          customer = await this.customerRepository.findOne({
            where: { email, organizationId: session.organizationId },
          });
        }
        if (!customer && phone) {
          customer = await this.customerRepository.findOne({
            where: { phone, organizationId: session.organizationId },
          });
        }
        if (!customer && customerName) {
          customer = await this.customerRepository.findOne({
            where: {
              displayName: customerName,
              organizationId: session.organizationId,
            },
          });
        }
      }

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
        // Save normalized data structure for Dossier & Customer migration (with formula sanitization)
        validRowsCount++;
        row.status = 'VALID';
        row.normalizedData = {
          code: sanitizeCellValue(code),
          name: sanitizeCellValue(name),
          customerId: customer?.id,
          route: sanitizeCellValue(String(data[routeKey] || '').trim()),
          startDate: startDate
            ? new Date(startDate).toISOString().slice(0, 10)
            : undefined,
          endDate: endDate
            ? new Date(endDate).toISOString().slice(0, 10)
            : undefined,
          priority: data[priorityKey] || 'MEDIUM',
          ...(customerName
            ? { customerName: sanitizeCellValue(customerName) }
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
                marketTypeCode: data.__marketTypeCode,
                revenueLines: data.__revenueLines,
                costLines: data.__costLines,
                sourceSummary: data.__sourceSummary,
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
    });
  }
}
