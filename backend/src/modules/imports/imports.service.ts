import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomInt } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { ImportSession } from './entities/import-session.entity';
import { ImportRow } from './entities/import-row.entity';
import { ImportError } from './entities/import-error.entity';
import { ImportTemplate } from './entities/import-template.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { EstimateRevenueLine } from '../estimates/entities/estimate-revenue-line.entity';
import { EstimateCostLine } from '../estimates/entities/estimate-cost-line.entity';
import { BusinessLine } from '../master-data/entities/business-line.entity';
import { MarketType } from '../master-data/entities/market-type.entity';
import { PassengerType } from '../master-data/entities/passenger-type.entity';
import { ServiceCategory } from '../master-data/entities/service-category.entity';
import { Unit } from '../master-data/entities/unit.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { SupplierType } from '../suppliers/entities/supplier-type.entity';

import { UploadImportDto } from './dto/upload-import.dto';
import { QueryImportDto } from './dto/query-import.dto';
import { UpdateImportRowDto } from './dto/update-import-row.dto';
import {
  CustomerType,
  EstimateStatus,
  ImportSessionStatus,
} from '../../common/enums';
import { sanitizeFileName } from '../../common/utils/filename.util';
import {
  CUSTOMER_BUDGET_FORMAT,
  CustomerBudgetLine,
} from './customer-budget.parser';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  AuditAction,
  AuditEntityType,
} from '../audit-logs/audit-event.constants';

function formatVnd(amount?: number): string {
  if (amount === undefined || amount === null) return '0 đ';
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))} đ`;
}

function normalizeCatalogName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function catalogCode(value: string, prefix: string, suffix = ''): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();
  return `${prefix}-${normalized || 'OTHER'}${suffix ? `-${suffix}` : ''}`.slice(
    0,
    50,
  );
}

function normalizeCustomerPhone(value?: string | null): string {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizeCustomerEmail(value?: string | null): string {
  return String(value ?? '').trim().toLowerCase();
}

function generateImportedDossierCode(name?: unknown): string {
  const nameSlug = String(name || 'DOSSIER')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
    .slice(0, 30);
  const randomNumber = randomInt(100000, 1000000).toString();
  return `${randomNumber}-${nameSlug || 'DOSSIER'}`.slice(0, 50);
}

@Injectable()
export class ImportsService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'imports');

  constructor(
    @InjectRepository(ImportSession)
    private readonly sessionRepository: Repository<ImportSession>,
    @InjectRepository(ImportRow)
    private readonly rowRepository: Repository<ImportRow>,
    @InjectRepository(ImportError)
    private readonly errorRepository: Repository<ImportError>,
    @InjectRepository(ImportTemplate)
    private readonly templateRepository: Repository<ImportTemplate>,
    @InjectRepository(Dossier)
    private readonly dossierRepository: Repository<Dossier>,
    @InjectQueue('import-queue')
    private readonly importQueue: Queue,
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(
    organizationId: string,
    userId: string,
    file: any,
    uploadImportDto: UploadImportDto,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng tải lên một tệp tin Excel');
    }

    // Check optional template validity if provided
    let template: ImportTemplate | null = null;
    if (uploadImportDto.templateId) {
      template = await this.templateRepository.findOne({
        where: { id: uploadImportDto.templateId, organizationId },
      });
      if (!template) {
        throw new NotFoundException(
          'Không tìm thấy template mẫu được chỉ định',
        );
      }
    }

    // Save Excel file to local disk for async processing
    const fileId = crypto.randomUUID();
    const cleanFileName = sanitizeFileName(file.originalname);
    const extension = path.extname(cleanFileName) || '.xlsx';
    const filePath = path.join(this.uploadDir, `${fileId}${extension}`);
    fs.writeFileSync(filePath, file.buffer);

    // Create session entity
    const session = this.sessionRepository.create({
      organizationId,
      templateId: template?.id,
      fileName: cleanFileName,
      fileUrl: `uploads/imports/${fileId}${extension}`,
      fileSize: file.size,
      status: ImportSessionStatus.UPLOADED,
      uploadedBy: userId,
      totalRows: 0,
      processedRows: 0,
      validRows: 0,
      errorRows: 0,
    });

    const savedSession = await this.sessionRepository.save(session);

    // Enqueue job to parse Excel file in background
    await this.importQueue.add('parse-excel', {
      sessionId: savedSession.id,
      filePath,
      templateType: uploadImportDto.templateType,
    });

    await this.auditLogsService.record({
      organizationId,
      actorUserId: userId,
      action: AuditAction.IMPORT_UPLOADED,
      entityType: AuditEntityType.IMPORT_SESSION,
      entityId: savedSession.id,
      afterData: {
        fileName: savedSession.fileName,
        fileSize: savedSession.fileSize,
        templateId: savedSession.templateId ?? null,
      },
    });

    return savedSession;
  }

  async findOne(organizationId: string, id: string) {
    const session = await this.sessionRepository.findOne({
      where: { id, organizationId },
      relations: { template: true, uploader: true },
    });

    if (!session) {
      throw new NotFoundException(
        `Không tìm thấy phiên nhập dữ liệu với ID: ${id}`,
      );
    }

    return session;
  }

  async preview(organizationId: string, id: string, queryDto: QueryImportDto) {
    // Verify session ownership
    await this.findOne(organizationId, id);

    const { page = 1, limit = 10, status } = queryDto;
    const skip = (page - 1) * limit;

    const where: any = { sessionId: id };
    if (status) {
      where.status = status;
    }

    const [items, total] = await this.rowRepository.findAndCount({
      where,
      order: { rowNumber: 'ASC' },
      skip,
      take: limit,
    });

    return {
      data: items,
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async errors(organizationId: string, id: string, queryDto: QueryImportDto) {
    // Verify session ownership
    await this.findOne(organizationId, id);

    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;

    const [items, total] = await this.errorRepository.findAndCount({
      where: { sessionId: id },
      order: { rowNumber: 'ASC', id: 'ASC' },
      skip,
      take: limit,
    });

    return {
      data: items,
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateRowStaging(
    organizationId: string,
    id: string,
    rowId: string,
    updateRowDto: UpdateImportRowDto,
  ) {
    // Verify session ownership
    await this.findOne(organizationId, id);

    const row = await this.rowRepository.findOne({
      where: { id: rowId, sessionId: id },
    });

    if (!row) {
      throw new NotFoundException(
        `Không tìm thấy dòng dữ liệu tạm với ID: ${rowId}`,
      );
    }

    // Update rawData and set status to PENDING for re-validation
    row.rawData = updateRowDto.rawData;
    row.status = 'PENDING';
    const savedRow = await this.rowRepository.save(row);

    // Re-trigger validation for this session asynchronously
    await this.validateSession(organizationId, id);

    return savedRow;
  }

  async validateSession(organizationId: string, id: string) {
    // Verify session ownership
    const session = await this.findOne(organizationId, id);

    // Update status to PROCESSING in DB
    session.status = ImportSessionStatus.PROCESSING;
    await this.sessionRepository.save(session);

    // Enqueue validation job
    await this.importQueue.add('validate-rows', {
      sessionId: id,
    });

    return { message: 'Tiến trình kiểm duyệt đang được chạy lại dưới nền' };
  }

  async confirm(organizationId: string, id: string, actorUserId?: string) {
    const session = await this.findOne(organizationId, id);

    // Reject if session contains error rows
    if (session.errorRows > 0) {
      throw new BadRequestException(
        'Không thể import phiên nhập dữ liệu có chứa lỗi. Vui lòng chỉnh sửa các dòng lỗi trước.',
      );
    }

    // Get all valid rows
    const validRows = await this.rowRepository.find({
      where: { sessionId: id, status: 'VALID' },
      order: { rowNumber: 'ASC' },
    });

    if (validRows.length === 0) {
      throw new BadRequestException(
        'Không có dòng dữ liệu hợp lệ nào để import.',
      );
    }

    // Execute bulk migration in a database transaction
    await this.dataSource.transaction(async (transactionalEntityManager) => {
      for (const row of validRows) {
        if (!row.normalizedData) continue;

        const {
          customerName,
          phone,
          email,
          dateOfBirth,
          customerId,
          customerCode,
          importFormat,
          businessLineCode,
          businessLineName,
          marketTypeCode,
          marketTypeName,
          revenueLines = [],
          costLines = [],
          sourceSummary,
          ...dossierFields
        } = row.normalizedData;

        // Customer-budget imports create one dossier per workbook row while
        // reusing the shared customer master when phone/email identifies the
        // same person. Duplicate contact values are valid here.
        let resolvedCustomerId =
          importFormat === CUSTOMER_BUDGET_FORMAT ? undefined : customerId;
        if (!resolvedCustomerId && importFormat === CUSTOMER_BUDGET_FORMAT) {
          const normalizedPhone = normalizeCustomerPhone(phone);
          const normalizedEmail = normalizeCustomerEmail(email);
          const existingCustomers =
            normalizedPhone || normalizedEmail
              ? await transactionalEntityManager.find(Customer, {
                  where: { organizationId },
                  order: { createdAt: 'ASC' },
                })
              : [];
          const matchingCustomers = existingCustomers.filter(
            (candidate: Customer) =>
              (normalizedPhone &&
                normalizeCustomerPhone(candidate.phone) === normalizedPhone) ||
              (normalizedEmail &&
                normalizeCustomerEmail(candidate.email) === normalizedEmail),
          );
          const existingCustomer = matchingCustomers[0];

          if (existingCustomer) {
            // A customer is the shared master record. Each import still
            // creates its own dossier, but matching phone/email reuses this
            // customer instead of creating a duplicate row.
            resolvedCustomerId = existingCustomer.id;
          } else {
            const generatedCode = `IMP-${id.slice(0, 8).toUpperCase()}`;
            const customer = transactionalEntityManager.create(Customer, {
              organizationId,
              code: generatedCode,
              customerType: CustomerType.INDIVIDUAL,
              displayName: customerName,
              phone,
              email,
              dateOfBirth,
            });
            const savedCustomer = await transactionalEntityManager.save(
              Customer,
              customer,
            );
            resolvedCustomerId = savedCustomer.id;
          }
        }

        if (!resolvedCustomerId && importFormat === CUSTOMER_BUDGET_FORMAT) {
          throw new BadRequestException(
            `Không thể xác định khách hàng cho dòng ${row.rowNumber}`,
          );
        }

        const businessLine = businessLineCode
          ? await transactionalEntityManager.findOne(BusinessLine, {
              where: { code: businessLineCode },
            })
          : null;
        const marketType = marketTypeCode
          ? await transactionalEntityManager.findOne(MarketType, {
              where: { code: marketTypeCode },
            })
          : null;

        // Map normalizedData directly to Dossier properties
        const dossierData = {
          ...dossierFields,
          code: generateImportedDossierCode(dossierFields.name),
          organizationId,
          customerId: resolvedCustomerId,
          ...(customerName ? { customerName } : {}),
          ...(businessLine ? { businessLineId: businessLine.id } : {}),
          ...(marketType ? { marketTypeId: marketType.id } : {}),
          ...(businessLineName ? { businessLineName } : {}),
          ...(marketTypeName ? { marketTypeName } : {}),
          // Imported dossiers belong to the user who uploaded the file unless
          // an explicit assignment workflow is introduced later.
          ...(session.uploadedBy ? { salesUserId: session.uploadedBy } : {}),
          createdBy: session.uploadedBy,
        };

        const dossier = this.dossierRepository.create(dossierData);
        const savedDossier = await transactionalEntityManager.save(
          Dossier,
          dossier,
        );

        if (importFormat === CUSTOMER_BUDGET_FORMAT) {
          const passengerTypes = new Map<string, string>();
          const units = new Map<string, string>();
          const serviceCategories = new Map<string, string>();
          const supplierByName = new Map<string, Supplier>();
          const supplierTypeByName = new Map<string, SupplierType>();
          const supplierLines = costLines.filter((line) =>
            Boolean(line.supplierName?.trim()),
          );
          const categoryNames: string[] = [];
          const categoryNameKeys = new Set<string>();
          for (const line of costLines as CustomerBudgetLine[]) {
            const categoryName = line.categoryName?.trim();
            const categoryKey = categoryName
              ? normalizeCatalogName(categoryName)
              : '';
            if (categoryName && !categoryNameKeys.has(categoryKey)) {
              categoryNameKeys.add(categoryKey);
              categoryNames.push(categoryName);
            }
          }

          // Read existing catalog records once per imported dossier so a
          // repeated workbook reuses the same supplier and supplier type.
          if (supplierLines.length > 0 || categoryNames.length > 0) {
            const [existingSuppliers, existingSupplierTypes] =
              await Promise.all([
                transactionalEntityManager.find(Supplier, {
                  where: { organizationId },
                }),
                transactionalEntityManager.find(SupplierType),
              ]);
            existingSuppliers.forEach((supplier) => {
              supplierByName.set(normalizeCatalogName(supplier.name), supplier);
            });
            existingSupplierTypes.forEach((supplierType) => {
              supplierTypeByName.set(
                normalizeCatalogName(supplierType.name),
                supplierType,
              );
            });
          }

          // Every numbered section in the workbook becomes a supplier type,
          // even when that section has no supplier on one particular file.
          for (const [sortOrder, categoryName] of categoryNames.entries()) {
            const categoryKey = normalizeCatalogName(categoryName);
            if (!supplierTypeByName.has(categoryKey)) {
              const supplierType = await transactionalEntityManager.save(
                SupplierType,
                transactionalEntityManager.create(SupplierType, {
                  code: catalogCode(categoryName, 'IMPORT-TYPE'),
                  name: categoryName,
                  status: 'ACTIVE',
                  sortOrder,
                }),
              );
              supplierTypeByName.set(categoryKey, supplierType);
            }
          }

          for (const line of revenueLines) {
            if (!passengerTypes.has(line.passengerTypeCode)) {
              const passengerType = await transactionalEntityManager.findOne(
                PassengerType,
                { where: { code: line.passengerTypeCode } },
              );
              if (passengerType)
                passengerTypes.set(line.passengerTypeCode, passengerType.id);
            }
            if (!units.has(line.unitCode)) {
              const unit = await transactionalEntityManager.findOne(Unit, {
                where: { code: line.unitCode },
              });
              if (unit) units.set(line.unitCode, unit.id);
            }
          }
          for (const line of costLines) {
            if (!serviceCategories.has(line.serviceCategoryCode)) {
              const serviceCategory = await transactionalEntityManager.findOne(
                ServiceCategory,
                { where: { code: line.serviceCategoryCode } },
              );
              if (serviceCategory) {
                serviceCategories.set(
                  line.serviceCategoryCode,
                  serviceCategory.id,
                );
              }
            }

            if (line.supplierName?.trim()) {
              const supplierName = line.supplierName.trim();
              const supplierKey = normalizeCatalogName(supplierName);
              let supplierTypeId: string | undefined;

              if (line.categoryName?.trim()) {
                const categoryName = line.categoryName.trim();
                const categoryKey = normalizeCatalogName(categoryName);
                const supplierType = supplierTypeByName.get(categoryKey);
                supplierTypeId = supplierType?.id;
              }

              let supplier = supplierByName.get(supplierKey);
              if (!supplier) {
                supplier = await transactionalEntityManager.save(
                  Supplier,
                  transactionalEntityManager.create(Supplier, {
                    organizationId,
                    code: catalogCode(
                      supplierName,
                      'IMPORT-NCC',
                      id.slice(0, 6).toUpperCase(),
                    ),
                    name: supplierName,
                    supplierTypeId,
                    status: 'ACTIVE',
                  }),
                );
                supplierByName.set(supplierKey, supplier);
              } else if (!supplier.supplierTypeId && supplierTypeId) {
                supplier.supplierTypeId = supplierTypeId;
                supplier = await transactionalEntityManager.save(
                  Supplier,
                  supplier,
                );
                supplierByName.set(supplierKey, supplier);
              }

              line.supplierId = supplier.id;
            }
          }

          const estimate = await transactionalEntityManager.save(
            Estimate,
            transactionalEntityManager.create(Estimate, {
              organizationId,
              dossierId: savedDossier.id,
              versionNo: 1,
              status: EstimateStatus.DRAFT,
              sourceImportSessionId: id,
              currency: 'VND',
              createdBy: session.uploadedBy,
              note: [
                `Import từ: ${session.fileName}`,
                sourceSummary?.totalRevenue !== undefined &&
                  `Doanh thu nguồn: ${formatVnd(sourceSummary.totalRevenue)}`,
                sourceSummary?.totalCost !== undefined &&
                  `Chi phí nguồn: ${formatVnd(sourceSummary.totalCost)}`,
                sourceSummary?.totalProfit !== undefined &&
                  `Lợi nhuận nguồn: ${formatVnd(sourceSummary.totalProfit)}`,
              ]
                .filter(Boolean)
                .join('\n'),
            }),
          );

          for (const line of revenueLines) {
            const netAmount =
              Number(line.quantity || 1) *
              Number(line.multiplier || 1) *
              Number(line.unitPrice || 0);
            const grossAmount =
              netAmount * (1 + Number(line.vatRate || 0) / 100);
            await transactionalEntityManager.save(
              EstimateRevenueLine,
              transactionalEntityManager.create(EstimateRevenueLine, {
                organizationId,
                estimateId: estimate.id,
                passengerTypeId: passengerTypes.get(line.passengerTypeCode),
                description: line.description,
                quantity: line.quantity,
                unitId: units.get(line.unitCode),
                multiplier: 1,
                unitPrice: line.unitPrice,
                vatRate: line.vatRate,
                netAmount,
                grossAmount,
                sortOrder: line.sortOrder,
              }),
            );
          }

          for (const line of costLines) {
            const quantity = Number(line.quantity ?? 1);
            const multiplier = Number(line.multiplier ?? 1);
            const unitPrice = Number(line.unitPrice ?? 0);
            const vatRate = Number(line.vatRate ?? 0);
            const netAmount = quantity * multiplier * unitPrice;
            const grossAmount = netAmount * (1 + vatRate / 100);
            await transactionalEntityManager.save(
              EstimateCostLine,
              transactionalEntityManager.create(EstimateCostLine, {
                organizationId,
                estimateId: estimate.id,
                serviceCategoryId: serviceCategories.get(
                  line.serviceCategoryCode,
                ),
                categoryTitle: line.categoryName,
                supplierId: line.supplierId,
                description: line.description,
                quantity: line.quantity,
                multiplier: line.multiplier,
                unitPrice: line.unitPrice,
                vatRate: line.vatRate,
                sourceAmount: line.sourceAmount,
                netAmount,
                grossAmount,
                note: line.note,
                sortOrder: line.sortOrder,
              }),
            );
          }
        }

        // Update shared customer contact details only. The imported customer
        // name is stored on the dossier as a snapshot so a new import cannot
        // rename every older dossier that points to the same customer.
        if (resolvedCustomerId && (phone || email || dateOfBirth)) {
          const updateCustomerData: any = {};
          if (phone) updateCustomerData.phone = phone;
          if (email) updateCustomerData.email = email;
          if (dateOfBirth) updateCustomerData.dateOfBirth = dateOfBirth;

          await transactionalEntityManager.update(
            Customer,
            { id: resolvedCustomerId, organizationId },
            updateCustomerData,
          );
        }

        // Mark row as IMPORTED
        row.status = 'IMPORTED';
        await transactionalEntityManager.save(ImportRow, row);
      }

      // Update session status to CONFIRMED
      session.status = ImportSessionStatus.CONFIRMED;
      await transactionalEntityManager.save(ImportSession, session);
    });

    await this.auditLogsService.record({
      organizationId,
      actorUserId: actorUserId ?? session.uploadedBy,
      action: AuditAction.IMPORT_CONFIRMED,
      entityType: AuditEntityType.IMPORT_SESSION,
      entityId: id,
      afterData: {
        status: ImportSessionStatus.CONFIRMED,
        importedRowsCount: validRows.length,
      },
    });

    return {
      message: 'Nhập dữ liệu thành công',
      importedRowsCount: validRows.length,
    };
  }
}
