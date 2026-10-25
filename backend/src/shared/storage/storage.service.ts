import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

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
  '.svg',
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

  constructor(private readonly configService: ConfigService) {
    this.cloudName = this.configService.get<string>('storage.cloudName');
    this.apiKey = this.configService.get<string>('storage.apiKey');
    this.apiSecret = this.configService.get<string>('storage.apiSecret');
    this.uploadPreset = this.configService.get<string>('storage.uploadPreset');
    this.cloudinaryFolder = (this.configService.get<string>('storage.folder') || '')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\\/g, '/');
    this.uploadDir =
      this.configService.get<string>('storage.uploadDir') || './uploads';

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
      this.logger.log('Cloudinary storage client initialized.');
    } else {
      this.logger.warn(
        'Cloudinary credentials not found. Falling back to local file storage.',
      );
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: UploadFileOptions,
    objectKey: string,
  ): Promise<UploadResult> {
    const fileSize = file.size ?? file.buffer.length;

    if (this.cloudinaryEnabled) {
      const resourceType = this.resourceTypeFromMimeType(file.mimetype);
      const publicId = this.toPublicId(objectKey, resourceType);
      const timestamp = Math.floor(Date.now() / 1000);
      const params: Record<string, string | number> = {
        public_id: publicId,
        timestamp,
        type: 'upload',
      };
      if (this.cloudinaryFolder) {
        params.asset_folder = this.cloudinaryFolder;
      }
      if (this.uploadPreset) params.upload_preset = this.uploadPreset;

      const formData = new FormData();
      formData.append(
        'file',
        new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
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
        throw new Error(`Cloudinary upload failed: ${message || response.statusText}`);
      }

      return { objectKey, fileSize, publicUrl: result.secure_url };
    }

    const fullPath = path.join(this.uploadDir, objectKey);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, file.buffer);
    return { objectKey, fileSize };
  }

  async getSignedDownloadUrl(
    objectKey: string,
    filename?: string,
    expiresIn = 3600,
  ): Promise<string> {
    if (this.cloudinaryEnabled) {
      const resourceType = this.resourceTypeFromExtension(objectKey);
      const publicId = this.toPublicId(objectKey, resourceType);
      const now = Math.floor(Date.now() / 1000);
      const params: Record<string, string | number> = {
        expires_at: now + Math.max(1, expiresIn),
        public_id: publicId,
        timestamp: now,
        type: 'upload',
      };
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

    return `/uploads/${objectKey}`;
  }

  async deleteFile(objectKey: string): Promise<void> {
    if (this.cloudinaryEnabled) {
      const resourceType = this.resourceTypeFromExtension(objectKey);
      const publicId = this.toPublicId(objectKey, resourceType);
      const timestamp = Math.floor(Date.now() / 1000);
      const params = { public_id: publicId, timestamp, type: 'upload' };
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
      if (!response.ok || result.result !== 'ok' && result.result !== 'not found') {
        throw new Error(
          `Cloudinary delete failed: ${result.error?.message || response.statusText}`,
        );
      }
      return;
    }

    const fullPath = path.join(this.uploadDir, objectKey);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath).catch(() => {});
    }
  }

  private signParams(params: Record<string, string | number>): string {
    const canonical = Object.entries(params)
      .filter(([, value]) => value !== '' && value !== undefined && value !== null)
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
