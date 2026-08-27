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

import { UploadImportDto } from './dto/upload-import.dto';
import { QueryImportDto } from './dto/query-import.dto';
import { UpdateImportRowDto } from './dto/update-import-row.dto';
import { ImportSessionStatus } from '../../common/enums';

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
          ...dossierFields
        } = row.normalizedData;

        // Map normalizedData directly to Dossier properties
        const dossierData = {
          ...dossierFields,
          organizationId,
          createdBy: session.uploadedBy,
        };

        const dossier = this.dossierRepository.create(dossierData);
        await transactionalEntityManager.save(Dossier, dossier);

        // Update customer details if customer exists and info was provided
        if (row.normalizedData.customerId && (phone || email || dateOfBirth || customerName)) {
          const updateCustomerData: any = {};
          if (phone) updateCustomerData.phone = phone;
          if (email) updateCustomerData.email = email;
          if (dateOfBirth) updateCustomerData.dateOfBirth = dateOfBirth;
          if (customerName) updateCustomerData.displayName = customerName;

          await transactionalEntityManager.update(
            Customer,
            { id: row.normalizedData.customerId, organizationId },
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
