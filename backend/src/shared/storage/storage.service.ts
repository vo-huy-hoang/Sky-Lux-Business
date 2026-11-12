import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { derivePurposeSecret } from '../../common/utils/jwt-purpose.util';
import {
  SAFE_RASTER_IMAGE_EXTENSIONS,
  UploadPolicy,
  ValidatedUpload,
  mimeTypeFromExtension,
  sanitizeObjectKey,
  validateUploadFile,
} from './file-validation.util';

export interface UploadFileOptions {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size?: number;
}

export interface UploadResult {
  objectKey: string;
  fileSize: number;
  publicUrl?: string;
}

export interface VerifiedFileDownloadToken {
  objectKey: string;
  organizationId?: string;
  filename?: string;
}

type CloudinaryResourceType = 'image' | 'video' | 'raw';
type CloudinaryUploadResponse = {
  secure_url: string;
  public_id: string;
  resource_type: CloudinaryResourceType;
};

const IMAGE_EXTENSIONS = new Set([
  '.avif',
  '.bmp',
  '.gif',
  '.heic',
  '.heif',
  '.jpeg',
  '.jpg',
  '.png',
  '.tif',
  '.tiff',
  '.webp',
]);
const VIDEO_EXTENSIONS = new Set([
  '.avi',
  '.m3u8',
  '.m4v',
  '.mkv',
  '.mov',
  '.mp4',
  '.mpeg',
  '.mpg',
  '.ogv',
  '.ts',
  '.webm',
]);

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly cloudName?: string;
  private readonly apiKey?: string;
  private readonly apiSecret?: string;
  private readonly uploadPreset?: string;
  private readonly cloudinaryFolder: string;
  private readonly uploadDir: string;
  private readonly cloudinaryEnabled: boolean;
  private readonly jwt: JwtService;

  constructor(
    private readonly configService: ConfigService,
    @Optional() jwtService?: JwtService,
  ) {
    this.jwt = jwtService ?? new JwtService();
    this.cloudName = this.configService.get<string>('storage.cloudName');
    this.apiKey = this.configService.get<string>('storage.apiKey');
    this.apiSecret = this.configService.get<string>('storage.apiSecret');
    this.uploadPreset = this.configService.get<string>('storage.uploadPreset');
    this.cloudinaryFolder = (
      this.configService.get<string>('storage.folder') || ''
    )
      .replace(/^\/+|\/+$/g, '')
      .replace(/\\/g, '/');
    this.uploadDir = path.resolve(
      this.configService.get<string>('storage.uploadDir') || './uploads',
    );

    const configured = [this.cloudName, this.apiKey, this.apiSecret].filter(
      Boolean,
    ).length;
    if (configured > 0 && configured < 3) {
      throw new Error(
        'Cloudinary configuration is incomplete. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      );
    }

    this.cloudinaryEnabled = configured === 3;
    if (this.cloudinaryEnabled) {
      this.logger.log(
        'Cloudinary storage client initialized (authenticated delivery).',
      );
    } else {
      this.logger.warn(
        'Cloudinary credentials not found. Using private local file storage.',
      );
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  isCloudinaryEnabled(): boolean {
    return this.cloudinaryEnabled;
  }

  validateUpload(
    file: UploadFileOptions,
    policy: UploadPolicy = 'document',
  ): ValidatedUpload {
    return validateUploadFile(file, policy);
  }

  async uploadFile(
    file: UploadFileOptions,
    objectKey: string,
    policy: UploadPolicy = 'document',
  ): Promise<UploadResult> {
    const safeKey = sanitizeObjectKey(objectKey);
    const validated = this.validateUpload(file, policy);
    const fileSize = file.size ?? file.buffer.length;

    if (this.cloudinaryEnabled) {
      const resourceType = this.resourceTypeFromMimeType(validated.mimeType);
      const publicId = this.toPublicId(safeKey, resourceType);
      const timestamp = Math.floor(Date.now() / 1000);
      const params: Record<string, string | number> = {
        public_id: publicId,
        timestamp,
        type: 'authenticated',
      };
      if (this.cloudinaryFolder) {
        params.asset_folder = this.cloudinaryFolder;
      }
      if (this.uploadPreset) params.upload_preset = this.uploadPreset;

      const formData = new FormData();
      formData.append(
        'file',
        new Blob([new Uint8Array(file.buffer)], { type: validated.mimeType }),
        file.originalname,
      );
      for (const [key, value] of Object.entries(params)) {
        formData.append(key, String(value));
      }
      formData.append('api_key', this.apiKey!);
      formData.append('signature', this.signParams(params));

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(this.cloudName!)}/${resourceType}/upload`,
        { method: 'POST', body: formData },
      );
      const result = (await response.json()) as
        | CloudinaryUploadResponse
        | { error?: { message?: string } };
      if (!response.ok || !('secure_url' in result)) {
        const message = 'error' in result ? result.error?.message : undefined;
        throw new Error(
          `Cloudinary upload failed: ${message || response.statusText}`,
        );
      }

      return { objectKey: safeKey, fileSize };
    }

    const fullPath = this.resolveSafeLocalPath(safeKey);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, file.buffer);
    return { objectKey: safeKey, fileSize };
  }

  async getSignedDownloadUrl(
    objectKey: string,
    filename?: string,
    expiresIn = 3600,
    organizationId?: string,
  ): Promise<string> {
    const safeKey = sanitizeObjectKey(objectKey);
    const boundedTtl = Math.min(Math.max(1, Number(expiresIn) || 3600), 86400);

    if (this.cloudinaryEnabled) {
      const resourceType = this.resourceTypeFromExtension(safeKey);
      const publicId = this.toPublicId(safeKey, resourceType);
      const ext = path.extname(safeKey).replace(/^\./, '').toLowerCase();
      const now = Math.floor(Date.now() / 1000);
      const params: Record<string, string | number> = {
        expires_at: now + boundedTtl,
        public_id: publicId,
        timestamp: now,
        type: 'authenticated',
      };
      if (resourceType !== 'raw' && ext) {
        params.format = ext;
      }
      if (filename) params.attachment = 'true';
      const search = new URLSearchParams({
        api_key: this.apiKey!,
        ...Object.fromEntries(
          Object.entries(params).map(([key, value]) => [key, String(value)]),
        ),
        signature: this.signParams(params),
      });
      return `https://api.cloudinary.com/v1_1/${encodeURIComponent(this.cloudName!)}/${resourceType}/download?${search.toString()}`;
    }

    const downloadSecret = this.getFileDownloadSecret();
    const token = await this.jwt.signAsync(
      {
        objectKey: safeKey,
        organizationId,
        filename: filename || path.basename(safeKey),
        purpose: 'file-download',
      },
      {
        secret: downloadSecret,
        expiresIn: boundedTtl,
      },
    );

    return `/api/files/download?token=${encodeURIComponent(token)}`;
  }

  async verifyDownloadToken(token: string): Promise<VerifiedFileDownloadToken> {
    if (!token) {
      throw new UnauthorizedException('Thiếu token tải tệp');
    }

    try {
      const payload = await this.jwt.verifyAsync<{
        objectKey: string;
        organizationId?: string;
        filename?: string;
        purpose?: string;
      }>(token, {
        secret: this.getFileDownloadSecret(),
      });

      if (payload.purpose !== 'file-download' || !payload.objectKey) {
        throw new UnauthorizedException('Token tải tệp không hợp lệ');
      }

      return {
        objectKey: sanitizeObjectKey(payload.objectKey),
        organizationId: payload.organizationId,
        filename: payload.filename,
      };
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Token tải tệp không hợp lệ hoặc đã hết hạn');
    }
  }

  getLocalFileMetadata(objectKey: string): {
    fullPath: string;
    mimeType: string;
    isSafeInline: boolean;
    fileName: string;
  } {
    const safeKey = sanitizeObjectKey(objectKey);
    const fullPath = this.resolveSafeLocalPath(safeKey);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('Không tìm thấy tệp tin được yêu cầu');
    }
    const ext = path.extname(safeKey).toLowerCase();
    return {
      fullPath,
      mimeType: mimeTypeFromExtension(safeKey),
      isSafeInline: SAFE_RASTER_IMAGE_EXTENSIONS.has(ext),
      fileName: path.basename(safeKey),
    };
  }

  async deleteFile(objectKey: string): Promise<void> {
    const safeKey = sanitizeObjectKey(objectKey);

    if (this.cloudinaryEnabled) {
      const resourceType = this.resourceTypeFromExtension(safeKey);
      const publicId = this.toPublicId(safeKey, resourceType);
      const timestamp = Math.floor(Date.now() / 1000);
      const params = {
        public_id: publicId,
        timestamp,
        type: 'authenticated',
      };
      const formData = new FormData();
      for (const [key, value] of Object.entries(params)) {
        formData.append(key, String(value));
      }
      formData.append('api_key', this.apiKey!);
      formData.append('signature', this.signParams(params));

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(this.cloudName!)}/${resourceType}/destroy`,
        { method: 'POST', body: formData },
      );
      const result = (await response.json()) as {
        result?: string;
        error?: { message?: string };
      };
      if (
        !response.ok ||
        (result.result !== 'ok' && result.result !== 'not found')
      ) {
        throw new Error(
          `Cloudinary delete failed: ${result.error?.message || response.statusText}`,
        );
      }
      return;
    }

    const fullPath = this.resolveSafeLocalPath(safeKey);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath).catch(() => {});
    }
  }

  resolveSafeLocalPath(objectKey: string): string {
    const safeKey = sanitizeObjectKey(objectKey);
    const baseDir = path.resolve(this.uploadDir);
    const resolved = path.resolve(baseDir, safeKey);
    if (resolved !== baseDir && !resolved.startsWith(baseDir + path.sep)) {
      throw new BadRequestException('Đường dẫn tệp vượt quá phạm vi lưu trữ');
    }
    return resolved;
  }

  private getFileDownloadSecret(): string {
    const masterSecret =
      this.configService.get<string>('JWT_SECRET') ||
      this.configService.get<string>('app.jwtSecret');
    if (!masterSecret) {
      throw new Error('JWT_SECRET is not configured');
    }
    return derivePurposeSecret(masterSecret, 'file-download');
  }

  private signParams(params: Record<string, string | number>): string {
    const canonical = Object.entries(params)
      .filter(
        ([, value]) => value !== '' && value !== undefined && value !== null,
      )
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return createHash('sha1')
      .update(`${canonical}${this.apiSecret}`)
      .digest('hex');
  }

  private resourceTypeFromMimeType(mimeType: string): CloudinaryResourceType {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'raw';
  }

  private resourceTypeFromExtension(objectKey: string): CloudinaryResourceType {
    const extension = path.extname(objectKey).toLowerCase();
    if (IMAGE_EXTENSIONS.has(extension)) return 'image';
    if (VIDEO_EXTENSIONS.has(extension)) return 'video';
    return 'raw';
  }

  private toPublicId(
    objectKey: string,
    resourceType: CloudinaryResourceType,
  ): string {
    const normalized = objectKey.replace(/^\/+/, '').replace(/\\/g, '/');
    const id =
      resourceType === 'raw'
        ? normalized
        : normalized.slice(0, normalized.length - path.extname(normalized).length);
    if (
      !this.cloudinaryFolder ||
      id === this.cloudinaryFolder ||
      id.startsWith(`${this.cloudinaryFolder}/`)
    ) {
      return id;
    }
    return `${this.cloudinaryFolder}/${id}`;
  }
}
