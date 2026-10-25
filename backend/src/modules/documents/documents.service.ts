import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import * as path from 'path';
import { Document } from './entities/document.entity';
import { DocumentType } from './entities/document-type.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { Dossier } from '../dossiers/entities/dossier.entity';
import { Estimate } from '../estimates/entities/estimate.entity';
import { StorageService } from '../../shared/storage/storage.service';
import { RedisService } from '../../common/redis/redis.service';
import { sanitizeFileName } from '../../common/utils/filename.util';
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
import { DocumentVersionQueryDto } from './dto/document-version-query.dto';

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
    @InjectRepository(Estimate)
    private readonly estimateRepository: Repository<Estimate>,
    private readonly storageService: StorageService,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
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
      data: items.map((doc) => this.toDocumentResponse(doc)),
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages,
      },
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

    if (dto.estimateId) {
      const estimate = await this.estimateRepository.findOne({
        where: { id: dto.estimateId, organizationId: user.organizationId },
        select: { id: true },
      });
      if (!estimate) {
        throw new NotFoundException(
          `Không tìm thấy dự toán với ID "${dto.estimateId}" trong tổ chức`,
        );
      }
    }

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
      originalName: sanitizeFileName(file.originalname),
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
    queryDto: DocumentVersionQueryDto,
  ) {
    await this.findAccessibleDocumentEntity(user, id);

    const { page, search } = queryDto;
    const limit = queryDto.pageSize || queryDto.limit;

    // Cache key pattern from detail design: skylux:documents::api:documents:id:versions:org:{organizationId}:user:{userId}:hash:{queryHash}
    const queryHash = crypto
      .createHash('md5')
      .update(JSON.stringify(queryDto))
      .digest('hex');
    const cacheKey = `skylux:documents::api:documents:${id}:versions:org:${user.organizationId}:user:${user.id}:hash:${queryHash}`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const queryBuilder = this.documentVersionRepository
      .createQueryBuilder('version')
      .leftJoinAndSelect('version.uploader', 'uploader')
      .where('version.documentId = :documentId', { documentId: id })
      .andWhere('version.organizationId = :organizationId', {
        organizationId: user.organizationId,
      });

    if (search) {
      queryBuilder.andWhere('version.changeNote ILIKE :search', {
        search: `%${search}%`,
      });
    }

    queryBuilder
      .orderBy('version.versionNo', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    const response = {
      data: items.map((v) => this.toDocumentVersionResponse(v)),
      meta: {
        page,
        pageSize: limit,
        total,
      },
    };

    await this.redisService.set(cacheKey, response, 60);

    return response;
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

    const savedDocId = id;

    await this.dataSource.transaction(async (manager) => {
      const versionNote =
        dto.versionNote ||
        dto.changeNote ||
        `Cập nhật phiên bản ${nextVersionNo}`;

      const newVersion = this.documentVersionRepository.create({
        organizationId: user.organizationId,
        documentId: id,
        versionNo: nextVersionNo,
        objectKey,
        fileSize: size,
        checksum,
        changeNote: versionNote,
        uploadedBy: user.id,
      });

      await manager.save(newVersion);

      document.versionNo = nextVersionNo;
      document.objectKey = objectKey;
      document.originalName = sanitizeFileName(file.originalname);
      document.mimeType = file.mimetype;
      document.fileSize = size;
      document.checksum = checksum;
      document.uploadedBy = user.id;

      if (dto.documentTypeId) {
        document.documentTypeId = dto.documentTypeId;
      }

      await manager.save(document);
    });

    // Cache invalidation for this document's versions
    await this.redisService.delByPattern(
      `skylux:documents::api:documents:${id}:versions:org:${user.organizationId}:*`,
    );

    const docResponse = await this.findOne(user, id);

    return docResponse;
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
        originalname: sanitizeFileName(file.originalname),
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
