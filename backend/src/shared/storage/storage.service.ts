import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client | null = null;
  private readonly bucket: string;
  private readonly publicDomain?: string;
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('storage.endpoint');
    const accessKeyId = this.configService.get<string>('storage.accessKeyId');
    const secretAccessKey = this.configService.get<string>(
      'storage.secretAccessKey',
    );
    const region = this.configService.get<string>('storage.region') || 'auto';
    this.bucket =
      this.configService.get<string>('storage.bucket') || 'skylux-files';
    this.publicDomain = this.configService.get<string>('storage.publicDomain');
    this.uploadDir =
      this.configService.get<string>('storage.uploadDir') || './uploads';

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region,
        endpoint: endpoint || undefined,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      });
      this.logger.log('S3 / Cloudflare R2 Storage client initialized.');
    } else {
      this.logger.warn(
        'S3 credentials not found. Falling back to local file storage.',
      );
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    }
  }

  async uploadFile(
    file: UploadFileOptions,
    objectKey: string,
  ): Promise<UploadResult> {
    const fileSize = file.size ?? file.buffer.length;

    if (this.s3Client) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          Body: file.buffer,
          ContentType: file.mimetype,
          Metadata: {
            'original-name': encodeURIComponent(file.originalname),
          },
        }),
      );
    } else {
      const fullPath = path.join(this.uploadDir, objectKey);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      await fs.promises.writeFile(fullPath, file.buffer);
    }

    const publicUrl = this.publicDomain
      ? `${this.publicDomain.replace(/\/$/, '')}/${objectKey}`
      : undefined;

    return {
      objectKey,
      fileSize,
      publicUrl,
    };
  }

  async getSignedDownloadUrl(
    objectKey: string,
    filename?: string,
    expiresIn = 3600,
  ): Promise<string> {
    if (this.s3Client) {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ResponseContentDisposition: filename
          ? `attachment; filename="${encodeURIComponent(filename)}"`
          : undefined,
      });
      return getSignedUrl(this.s3Client, command, { expiresIn });
    }

    if (this.publicDomain) {
      return `${this.publicDomain.replace(/\/$/, '')}/${objectKey}?expires=${Date.now() + expiresIn * 1000}`;
    }

    return `/uploads/${objectKey}`;
  }

  async deleteFile(objectKey: string): Promise<void> {
    if (this.s3Client) {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
        }),
      );
    } else {
      const fullPath = path.join(this.uploadDir, objectKey);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath).catch(() => {});
      }
    }
  }
}
