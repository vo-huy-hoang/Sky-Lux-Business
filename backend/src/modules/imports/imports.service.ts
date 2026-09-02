import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
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

import { UploadImportDto } from './dto/upload-import.dto';
import { QueryImportDto } from './dto/query-import.dto';
import { UpdateImportRowDto } from './dto/update-import-row.dto';
import {
  CustomerType,
  EstimateStatus,
  ImportSessionStatus,
} from '../../common/enums';
import { CUSTOMER_BUDGET_FORMAT } from './customer-budget.parser';

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
    const extension = path.extname(file.originalname) || '.xlsx';
    const filePath = path.join(this.uploadDir, `${fileId}${extension}`);
    fs.writeFileSync(filePath, file.buffer);

    // Create session entity
    const session = this.sessionRepository.create({
      organizationId,
      templateId: template?.id,
      fileName: file.originalname,
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
      items,
      total,
      page,
      limit,
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
      items,
      total,
      page,
      limit,
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

  async confirm(organizationId: string, id: string) {
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
          marketTypeCode,
          revenueLines = [],
          costLines = [],
          sourceSummary,
          ...dossierFields
        } = row.normalizedData;

        let resolvedCustomerId = customerId;
        if (!resolvedCustomerId && importFormat === CUSTOMER_BUDGET_FORMAT) {
          let customer = email
            ? await transactionalEntityManager.findOne(Customer, {
                where: { email, organizationId },
              })
            : null;
          if (!customer && phone) {
            customer = await transactionalEntityManager.findOne(Customer, {
              where: { phone, organizationId },
            });
          }
          if (!customer && customerName) {
            customer = await transactionalEntityManager.findOne(Customer, {
              where: { displayName: customerName, organizationId },
            });
          }
          if (!customer) {
            const generatedCode = `IMP-${id.slice(0, 8).toUpperCase()}`;
            customer = transactionalEntityManager.create(Customer, {
              organizationId,
              code: generatedCode,
              customerType: CustomerType.INDIVIDUAL,
              displayName: customerName,
              phone,
              email,
              dateOfBirth,
            });
            customer = await transactionalEntityManager.save(
              Customer,
              customer,
            );
          }
          resolvedCustomerId = customer.id;
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
          organizationId,
          customerId: resolvedCustomerId,
          ...(businessLine ? { businessLineId: businessLine.id } : {}),
          ...(marketType ? { marketTypeId: marketType.id } : {}),
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
                `Import từ ${session.fileName}`,
                sourceSummary?.totalRevenue !== undefined &&
                  `Doanh thu nguồn: ${sourceSummary.totalRevenue}`,
                sourceSummary?.totalCost !== undefined &&
                  `Chi phí nguồn: ${sourceSummary.totalCost}`,
                sourceSummary?.totalProfit !== undefined &&
                  `Lợi nhuận nguồn: ${sourceSummary.totalProfit}`,
              ]
                .filter(Boolean)
                .join('; '),
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
            const calculatedNetAmount =
              Number(line.quantity || 1) *
              Number(line.multiplier || 1) *
              Number(line.unitPrice || 0);
            const importedAmount = Number(line.sourceAmount);
            const hasImportedAmount = Number.isFinite(importedAmount);
            // The Excel amount column is already the authoritative total.
            // Do not add VAT again when the source amount is present.
            const netAmount = hasImportedAmount
              ? importedAmount
              : calculatedNetAmount;
            const grossAmount = hasImportedAmount
              ? importedAmount
              : calculatedNetAmount * (1 + Number(line.vatRate || 0) / 100);
            const sourceNote = `Số tiền nguồn: ${line.sourceAmount}`;
            await transactionalEntityManager.save(
              EstimateCostLine,
              transactionalEntityManager.create(EstimateCostLine, {
                organizationId,
                estimateId: estimate.id,
                serviceCategoryId: serviceCategories.get(
                  line.serviceCategoryCode,
                ),
                description: line.description,
                quantity: line.quantity,
                multiplier: line.multiplier,
                unitPrice: line.unitPrice,
                vatRate: line.vatRate,
                netAmount,
                grossAmount,
                note: [line.note, sourceNote].filter(Boolean).join('; '),
                sortOrder: line.sortOrder,
              }),
            );
          }
        }

        // Update customer details if customer exists and info was provided
        if (
          resolvedCustomerId &&
          (phone || email || dateOfBirth || customerName)
        ) {
          const updateCustomerData: any = {};
          if (phone) updateCustomerData.phone = phone;
          if (email) updateCustomerData.email = email;
          if (dateOfBirth) updateCustomerData.dateOfBirth = dateOfBirth;
          if (customerName) updateCustomerData.displayName = customerName;

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

    return {
      message: 'Nhập dữ liệu thành công',
      importedRowsCount: validRows.length,
    };
  }
}
