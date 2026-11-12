import { BadRequestException } from '@nestjs/common';
import * as path from 'path';

export type UploadPolicy = 'chat' | 'document' | 'import';

export interface UploadValidationInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size?: number;
}

export interface ValidatedUpload {
  extension: string;
  mimeType: string;
  isRasterImage: boolean;
}

export const SAFE_RASTER_IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
]);

const BLOCKED_EXTENSIONS = new Set([
  '.svg',
  '.svgz',
  '.html',
  '.htm',
  '.xhtml',
  '.xml',
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.ts',
  '.tsx',
  '.php',
  '.phtml',
  '.asp',
  '.aspx',
  '.jsp',
  '.cgi',
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.bash',
  '.ps1',
  '.msi',
  '.vbs',
  '.vbe',
  '.scr',
  '.jar',
  '.com',
  '.pif',
  '.dll',
  '.app',
  '.dmg',
  '.bin',
  '.iso',
  '.apk',
]);

const BLOCKED_MIME_TYPES = new Set([
  'image/svg+xml',
  'text/html',
  'application/xhtml+xml',
  'application/xml',
  'text/xml',
  'application/javascript',
  'text/javascript',
  'application/x-javascript',
  'application/x-msdownload',
  'application/x-sh',
]);

const POLICY_ALLOWED_EXTENSIONS: Record<UploadPolicy, Set<string>> = {
  import: new Set(['.xlsx', '.xls', '.csv']),
  chat: new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.gif',
    '.pdf',
    '.xlsx',
    '.xls',
    '.csv',
    '.docx',
  ]),
  document: new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.gif',
    '.pdf',
    '.xlsx',
    '.xls',
    '.csv',
    '.docx',
  ]),
};

const CANONICAL_MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.csv': 'text/csv',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const ALLOWED_MIMES_BY_EXT: Record<string, Set<string>> = {
  '.png': new Set(['image/png']),
  '.jpg': new Set(['image/jpeg', 'image/jpg']),
  '.jpeg': new Set(['image/jpeg', 'image/jpg']),
  '.webp': new Set(['image/webp']),
  '.gif': new Set(['image/gif']),
  '.pdf': new Set(['application/pdf', 'application/x-pdf']),
  '.xlsx': new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream',
    'application/zip',
  ]),
  '.xls': new Set([
    'application/vnd.ms-excel',
    'application/msexcel',
    'application/x-msexcel',
    'application/octet-stream',
  ]),
  '.csv': new Set([
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'text/plain',
  ]),
  '.docx': new Set([
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/octet-stream',
    'application/zip',
  ]),
};

const ACTIVE_TEXT_SIGNATURES = [
  /^<\s*svg\b/i,
  /^<\?\s*xml\b/i,
  /^<!doctype\s+html\b/i,
  /^<\s*html\b/i,
  /^<\s*script\b/i,
  /^<\s*iframe\b/i,
  /^<\s*object\b/i,
  /^<\s*embed\b/i,
  /^<\?php\b/i,
  /^#!/,
  /^<%/,
];

function looksLikeActiveScriptOrMarkup(buffer: Buffer): boolean {
  const sample = buffer
    .subarray(0, Math.min(buffer.length, 512))
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .trimStart();

  return ACTIVE_TEXT_SIGNATURES.some((pattern) => pattern.test(sample));
}

function hasMagicSignature(extension: string, buffer: Buffer): boolean {
  if (!buffer || buffer.length === 0) {
    return false;
  }

  switch (extension) {
    case '.png':
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    case '.jpg':
    case '.jpeg':
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    case '.gif': {
      const header = buffer.subarray(0, 6).toString('ascii');
      return header === 'GIF87a' || header === 'GIF89a';
    }
    case '.webp':
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    case '.pdf':
      return (
        buffer.length >= 4 &&
        buffer.subarray(0, 4).toString('ascii') === '%PDF'
      );
    case '.xlsx':
    case '.docx':
      return (
        buffer.length >= 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        ((buffer[2] === 0x03 && buffer[3] === 0x04) ||
          (buffer[2] === 0x05 && buffer[3] === 0x06) ||
          (buffer[2] === 0x07 && buffer[3] === 0x08))
      );
    case '.xls':
      return (
        buffer.length >= 8 &&
        buffer[0] === 0xd0 &&
        buffer[1] === 0xcf &&
        buffer[2] === 0x11 &&
        buffer[3] === 0xe0 &&
        buffer[4] === 0xa1 &&
        buffer[5] === 0xb1 &&
        buffer[6] === 0x1a &&
        buffer[7] === 0xe1
      );
    case '.csv':
      return !buffer.includes(0x00);
    default:
      return false;
  }
}

export function mimeTypeFromExtension(objectKeyOrExt: string): string {
  const ext = objectKeyOrExt.startsWith('.')
    ? objectKeyOrExt.toLowerCase()
    : path.extname(objectKeyOrExt).toLowerCase();
  return CANONICAL_MIME_BY_EXT[ext] || 'application/octet-stream';
}

export function sanitizeObjectKey(objectKey: string): string {
  if (!objectKey || typeof objectKey !== 'string') {
    throw new BadRequestException('Khóa lưu trữ tệp không hợp lệ');
  }
  if (objectKey.includes('\0')) {
    throw new BadRequestException('Khóa lưu trữ tệp chứa ký tự không hợp lệ');
  }

  let decoded = objectKey;
  try {
    decoded = decodeURIComponent(objectKey);
  } catch {
    throw new BadRequestException('Khóa lưu trữ tệp không đúng định dạng');
  }

  const normalized = decoded.replace(/\\/g, '/').replace(/^\/+/, '');
  const segments = normalized.split('/');
  if (
    !normalized ||
    segments.some(
      (segment) => !segment || segment === '.' || segment === '..',
    )
  ) {
    throw new BadRequestException('Đường dẫn lưu trữ tệp không hợp lệ');
  }

  return segments.join('/');
}

export function validateUploadFile(
  file: UploadValidationInput,
  policy: UploadPolicy,
): ValidatedUpload {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw new BadRequestException('Vui lòng tải lên tệp hợp lệ không rỗng');
  }

  const normalizedName = String(file.originalname || '').trim();
  const ext = path.extname(normalizedName).toLowerCase();
  const normalizedMime = String(file.mimetype || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

  if (!ext || BLOCKED_EXTENSIONS.has(ext) || BLOCKED_MIME_TYPES.has(normalizedMime)) {
    throw new BadRequestException(
      'Định dạng tệp không được phép tải lên vì lý do bảo mật',
    );
  }

  const allowedExtensions = POLICY_ALLOWED_EXTENSIONS[policy];
  if (!allowedExtensions.has(ext)) {
    throw new BadRequestException(
      `Định dạng tệp "${ext}" không nằm trong danh sách được phép cho ${policy}`,
    );
  }

  const allowedMimes = ALLOWED_MIMES_BY_EXT[ext];
  if (normalizedMime && allowedMimes && !allowedMimes.has(normalizedMime)) {
    throw new BadRequestException(
      `MIME type "${normalizedMime}" không khớp với phần mở rộng "${ext}"`,
    );
  }

  if (looksLikeActiveScriptOrMarkup(file.buffer)) {
    throw new BadRequestException(
      'Tệp chứa nội dung markup hoặc script không được phép',
    );
  }

  if (!hasMagicSignature(ext, file.buffer)) {
    throw new BadRequestException(
      `Chữ ký nhị phân (magic bytes) của tệp không khớp với định dạng "${ext}"`,
    );
  }

  return {
    extension: ext,
    mimeType: CANONICAL_MIME_BY_EXT[ext] || normalizedMime,
    isRasterImage: SAFE_RASTER_IMAGE_EXTENSIONS.has(ext),
  };
}

