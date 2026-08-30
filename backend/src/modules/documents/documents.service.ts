import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as path from 'path';
import { Document } from './entities/document.entity';
import { DocumentType } from './entities/document-type.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { StorageService } from '../../shared/storage/storage.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PaginatedResponse } from '../../common/interfaces/api-response.interface';
import { DossierStatus } from '../../common/enums';
import { QueryDocumentDto } from './dto/query-document.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DownloadUrlQueryDto } from './dto/download-url-query.dto';
import { CreateDocumentVersionDto } from './dto/create-document-version.dto';
import {
  DocumentResponseDto,
  DocumentTypeResponseDto,
  DocumentUploaderResponseDto,
  DocumentVersionResponseDto,
  DownloadUrlResponseDto,
} from './dto/document-response.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(DocumentType)
    private readonly documentTypeRepository: Repository<DocumentType>,
    @InjectRepository(DocumentVersion)
    private readonly documentVersionRepository: Repository<DocumentVersion>,
    @InjectRepository(Dossier)
    private readonly dossierRepository: Repository<Dossier>,
    private readonly storageService: StorageService,
  ) {}

  /**
   * API-DOCUMENT-001: Danh sách tài liệu của hồ sơ
   */
  async findByDossier(
    user: CurrentUserPayload,
    dossierId: string,
    queryDto: QueryDocumentDto,
  ): Promise<PaginatedResponse<DocumentResponseDto>> {
    await this.checkDossierAccess(user, dossierId);
    const { page, search, documentTypeId } = queryDto;
    const limit = queryDto.pageSize || queryDto.limit;
    const organizationId = user.organizationId;

    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.documentType', 'documentType')
      .leftJoinAndSelect('document.uploader', 'uploader')
      .where('document.dossierId = :dossierId', { dossierId })
      .andWhere('document.organizationId = :organizationId', {
        organizationId,
      });

    if (documentTypeId) {
      queryBuilder.andWhere('document.documentTypeId = :documentTypeId', {
        documentTypeId,
      });
    }

    if (search) {
      queryBuilder.andWhere('document.originalName ILIKE :search', {
        search: `%${search}%`,
      });
    }

    queryBuilder
      .orderBy('document.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map((doc) => this.toDocumentResponse(doc)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * API-DOCUMENT-002: Upload tài liệu cho hồ sơ
   */
  async uploadForDossier(
    user: CurrentUserPayload,
    dossierId: string,
    file: Express.Multer.File,
    dto: CreateDocumentDto,
  ): Promise<DocumentResponseDto> {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        'Vui lòng chọn tệp tài liệu hợp lệ để tải lên',
      );
    }

    await this.checkDossierAccess(user, dossierId, true);

    if (dto.documentTypeId) {
      const typeExists = await this.documentTypeRepository.findOne({
        where: { id: dto.documentTypeId },
      });
      if (!typeExists) {
        throw new NotFoundException(
          `Không tìm thấy loại tài liệu với ID "${dto.documentTypeId}"`,
        );
      }
    }

    const { objectKey, checksum, size } = await this.uploadBufferToStorage(
      file,
      `organizations/${user.organizationId}/dossiers/${dossierId}`,
    );

    const document = this.documentRepository.create({
      organizationId: user.organizationId,
      dossierId,
      estimateId: dto.estimateId || undefined,
      documentTypeId: dto.documentTypeId || undefined,
      originalName: file.originalname,
      objectKey,
      mimeType: file.mimetype,
      fileSize: size,
      checksum,
      versionNo: 1,
      uploadedBy: user.id,
    });

    const savedDoc = await this.documentRepository.save(document);

    const initialVersion = this.documentVersionRepository.create({
      organizationId: user.organizationId,
      documentId: savedDoc.id,
      versionNo: 1,
      objectKey,
      fileSize: size,
      checksum,
      changeNote: dto.changeNote || 'Phiên bản đầu tiên',
      uploadedBy: user.id,
    });

    await this.documentVersionRepository.save(initialVersion);

    return this.findOne(user, savedDoc.id);
  }

  /**
   * API-DOCUMENT-003: Chi tiết tài liệu
   */
  async findOne(
    user: CurrentUserPayload,
    id: string,
  ): Promise<DocumentResponseDto> {
    const document = await this.findAccessibleDocumentEntity(user, id);
    return this.toDocumentResponse(document);
  }

  /**
   * API-DOCUMENT-004: Xóa tài liệu
   */
  async remove(
    user: CurrentUserPayload,
    id: string,
  ): Promise<{ deleted: boolean }> {
    const document = await this.findAccessibleDocumentEntity(user, id);

    if (document.dossier && document.dossier.status === DossierStatus.LOCKED) {
      throw new BadRequestException(
        'Không thể xóa tài liệu khi hồ sơ đã bị khóa',
      );
    }

    await this.documentRepository.softRemove(document);
    return { deleted: true };
  }

  /**
   * API-DOCUMENT-005: Lấy signed URL download
   */
  async getDownloadUrl(
    user: CurrentUserPayload,
    id: string,
    query?: DownloadUrlQueryDto,
  ): Promise<DownloadUrlResponseDto> {
    const document = await this.findAccessibleDocumentEntity(user, id);
    const expiresIn = query?.expiresIn || 3600;

    let targetObjectKey = document.objectKey;
    const targetFileName = document.originalName;
    let targetVersionNo = document.versionNo;
    let targetFileSize = Number(document.fileSize);

    if (query?.versionNo) {
      const version = await this.documentVersionRepository.findOne({
        where: {
          documentId: id,
          versionNo: query.versionNo,
          organizationId: user.organizationId,
        },
      });

      if (!version) {
        throw new NotFoundException(
          `Không tìm thấy phiên bản ${query.versionNo} của tài liệu`,
        );
      }

      targetObjectKey = version.objectKey;
      targetVersionNo = version.versionNo;
      targetFileSize = Number(version.fileSize);
    }

    const downloadUrl = await this.storageService.getSignedDownloadUrl(
      targetObjectKey,
      targetFileName,
      expiresIn,
    );

    return {
      downloadUrl,
      originalName: targetFileName,
      mimeType: document.mimeType,
      fileSize: targetFileSize,
      versionNo: targetVersionNo,
      expiresIn,
    };
  }

  /**
   * API-DOCVER-001: Lấy danh sách phiên bản của tài liệu
   */
  async findVersions(
    user: CurrentUserPayload,
    id: string,
  ): Promise<DocumentVersionResponseDto[]> {
    await this.findAccessibleDocumentEntity(user, id);

    const versions = await this.documentVersionRepository.find({
      where: { documentId: id, organizationId: user.organizationId },
      relations: { uploader: true },
      order: { versionNo: 'DESC' },
    });

    return versions.map((v) => this.toDocumentVersionResponse(v));
  }

  /**
   * API-DOCVER-002: Tải lên phiên bản mới của tài liệu
   */
  async createVersion(
    user: CurrentUserPayload,
    id: string,
    file: Express.Multer.File,
    dto: CreateDocumentVersionDto,
  ): Promise<DocumentResponseDto> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn tệp phiên bản mới hợp lệ');
    }

    const document = await this.findAccessibleDocumentEntity(user, id);

    if (document.dossier && document.dossier.status === DossierStatus.LOCKED) {
      throw new BadRequestException(
        'Không thể thêm phiên bản tài liệu mới khi hồ sơ đã bị khóa',
      );
    }

    const nextVersionNo = document.versionNo + 1;
    const folderPath = document.dossierId
      ? `organizations/${user.organizationId}/dossiers/${document.dossierId}`
      : `organizations/${user.organizationId}/documents/${id}`;

    const { objectKey, checksum, size } = await this.uploadBufferToStorage(
      file,
      folderPath,
      `-v${nextVersionNo}`,
    );

    const newVersion = this.documentVersionRepository.create({
      organizationId: user.organizationId,
      documentId: id,
      versionNo: nextVersionNo,
      objectKey,
      fileSize: size,
      checksum,
      changeNote: dto.changeNote || `Cập nhật phiên bản ${nextVersionNo}`,
      uploadedBy: user.id,
    });

    await this.documentVersionRepository.save(newVersion);

    document.versionNo = nextVersionNo;
    document.objectKey = objectKey;
    document.originalName = file.originalname;
    document.mimeType = file.mimetype;
    document.fileSize = size;
    document.checksum = checksum;
    document.uploadedBy = user.id;

    await this.documentRepository.save(document);

    return this.findOne(user, id);
  }

  private async uploadBufferToStorage(
    file: Express.Multer.File,
    dirPrefix: string,
    verSuffix = '',
  ) {
    const ext = path.extname(file.originalname) || '';
    const key = `${dirPrefix}/${crypto.randomUUID()}${verSuffix}${ext}`;
    const hash = crypto.createHash('md5').update(file.buffer).digest('hex');
    const bytes = file.size || file.buffer.length;

    await this.storageService.uploadFile(
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: bytes,
      },
      key,
    );

    return { objectKey: key, checksum: hash, size: bytes };
  }

  private async checkDossierAccess(
    user: CurrentUserPayload,
    dossierId: string,
    isWrite = false,
  ): Promise<Dossier> {
    const dossier = await this.dossierRepository.findOne({
      where: { id: dossierId, organizationId: user.organizationId },
    });

    if (!dossier) {
      throw new NotFoundException(`Không tìm thấy hồ sơ với ID "${dossierId}"`);
    }

    const hasViewPerm =
      user.permissions.includes('dossier.view.all') ||
      user.permissions.includes('*') ||
      user.roles.includes('SUPER_ADMIN') ||
      (user.permissions.includes('dossier.view.own') &&
        (dossier.salesUserId === user.id || dossier.createdBy === user.id));

    if (!hasViewPerm) {
      throw new NotFoundException(`Không tìm thấy hồ sơ với ID "${dossierId}"`);
    }

    if (isWrite && dossier.status === DossierStatus.LOCKED) {
      throw new BadRequestException(
        'Không thể thêm hoặc chỉnh sửa tài liệu khi hồ sơ đã bị khóa',
      );
    }

    return dossier;
  }

  private async findAccessibleDocumentEntity(
    user: CurrentUserPayload,
    id: string,
  ): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id, organizationId: user.organizationId },
      relations: {
        documentType: true,
        uploader: true,
        versions: {
          uploader: true,
        },
        dossier: true,
      },
    });

    if (!document) {
      throw new NotFoundException(`Không tìm thấy tài liệu với ID "${id}"`);
    }

    if (document.dossier) {
      await this.checkDossierAccess(user, document.dossier.id);
    }

    return document;
  }

  private toDocumentResponse(doc: Document): DocumentResponseDto {
    return {
      id: doc.id,
      organizationId: doc.organizationId,
      dossierId: doc.dossierId,
      estimateId: doc.estimateId,
      documentTypeId: doc.documentTypeId,
      originalName: doc.originalName,
      mimeType: doc.mimeType,
      fileSize: Number(doc.fileSize),
      checksum: doc.checksum,
      versionNo: doc.versionNo,
      uploadedBy: doc.uploadedBy,
      uploader: this.toUploaderResponse(doc.uploader),
      documentType: this.toDocumentTypeResponse(doc.documentType),
      versions: doc.versions?.map((ver) => this.toDocumentVersionResponse(ver)),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private toDocumentVersionResponse(
    version: DocumentVersion,
  ): DocumentVersionResponseDto {
    return {
      id: version.id,
      organizationId: version.organizationId,
      documentId: version.documentId,
      versionNo: version.versionNo,
      fileSize: Number(version.fileSize),
      checksum: version.checksum,
      changeNote: version.changeNote,
      uploadedBy: version.uploadedBy,
      uploader: this.toUploaderResponse(version.uploader),
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
    };
  }

  private toUploaderResponse(
    user?: Document['uploader'],
  ): DocumentUploaderResponseDto | undefined {
    if (!user) {
      return undefined;
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      avatarUrl: user.avatarUrl,
    };
  }

  private toDocumentTypeResponse(
    type?: Document['documentType'],
  ): DocumentTypeResponseDto | undefined {
    if (!type) {
      return undefined;
    }

    return {
      id: type.id,
      code: type.code,
      name: type.name,
      description: type.description,
      status: type.status,
      sortOrder: type.sortOrder,
    };
  }
}
