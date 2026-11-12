import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Optional,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { DataSource } from 'typeorm';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { sanitizeFileName } from '../../common/utils/filename.util';
import { StorageService } from './storage.service';
import { sanitizeObjectKey } from './file-validation.util';

@ApiTags('Files')
@ApiBearerAuth('JWT-auth')
@Controller('files')
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  @Get('download')
  @ApiOperation({ summary: 'Tải tài liệu hoặc tệp qua signed token nội bộ' })
  async downloadByToken(
    @CurrentUser() user: CurrentUserPayload,
    @Query('token') token: string,
    @Query('inline') inline: string | undefined,
    @Res() res: Response,
  ) {
    const verified = await this.storageService.verifyDownloadToken(token);

    if (
      verified.organizationId &&
      verified.organizationId !== user.organizationId
    ) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập tệp của tổ chức khác',
      );
    }

    this.assertObjectKeyBelongsToOrganization(
      verified.objectKey,
      user.organizationId,
    );

    if (this.storageService.isCloudinaryEnabled()) {
      const signedUrl = await this.storageService.getSignedDownloadUrl(
        verified.objectKey,
        verified.filename,
        300,
        user.organizationId,
      );
      return res.redirect(302, signedUrl);
    }

    const fileMeta = this.storageService.getLocalFileMetadata(
      verified.objectKey,
    );
    const safeDownloadName = sanitizeFileName(
      verified.filename || fileMeta.fileName,
    );
    const useInline = inline === 'true' && fileMeta.isSafeInline;

    this.sendSafeFileResponse(res, {
      fullPath: fileMeta.fullPath,
      mimeType: fileMeta.mimeType,
      fileName: safeDownloadName,
      disposition: useInline ? 'inline' : 'attachment',
      cacheControl: 'private, no-store',
    });
  }

  @Get('chat')
  @ApiOperation({ summary: 'Truy cập tệp đính kèm chat theo phân vùng tổ chức' })
  async getChatAttachment(
    @CurrentUser() user: CurrentUserPayload,
    @Query('key') key: string,
    @Query('download') download: string | undefined,
    @Res() res: Response,
  ) {
    if (!key) {
      throw new BadRequestException('Thiếu khóa tệp đính kèm');
    }

    const safeKey = sanitizeObjectKey(key);
    const expectedPrefix = `${user.organizationId}/chat/`;
    if (!safeKey.startsWith(expectedPrefix)) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập tệp đính kèm của tổ chức khác',
      );
    }

    await this.assertChatAttachmentAuthorized(safeKey, user);

    if (this.storageService.isCloudinaryEnabled()) {
      const signedUrl = await this.storageService.getSignedDownloadUrl(
        safeKey,
        undefined,
        300,
        user.organizationId,
      );
      return res.redirect(302, signedUrl);
    }

    const fileMeta = this.storageService.getLocalFileMetadata(safeKey);
    const disposition =
      download !== 'true' && fileMeta.isSafeInline ? 'inline' : 'attachment';

    this.sendSafeFileResponse(res, {
      fullPath: fileMeta.fullPath,
      mimeType: fileMeta.mimeType,
      fileName: sanitizeFileName(fileMeta.fileName),
      disposition,
      cacheControl: 'private, max-age=300',
    });
  }

  private async assertChatAttachmentAuthorized(
    safeKey: string,
    user: CurrentUserPayload,
  ): Promise<void> {
    if (!this.dataSource) {
      return;
    }

    const rows: Array<{ is_member: boolean | number }> =
      await this.dataSource.query(
        `
        SELECT EXISTS (
          SELECT 1
          FROM conversation_participants cp
          WHERE cp.conversation_id = m.conversation_id
            AND cp.organization_id = $1
            AND cp.user_id = $2
        ) AS is_member
        FROM messages m
        WHERE m.organization_id = $1
          AND m.attachments IS NOT NULL
          AND (
            m.attachments::text LIKE $3
            OR m.attachments::text LIKE $4
          )
        LIMIT 5
        `,
        [
          user.organizationId,
          user.id,
          `%${safeKey}%`,
          `%${encodeURIComponent(safeKey)}%`,
        ],
      );

    if (rows.length > 0) {
      if (!rows.some((row) => Boolean(row.is_member))) {
        throw new ForbiddenException(
          'Bạn không có quyền truy cập tệp đính kèm của cuộc hội thoại này',
        );
      }
      return;
    }

    // Pending (not-yet-sent) chat attachment: key format orgId/chat/YYYY/MM/userId/filename
    const parts = safeKey.split('/');
    const uploaderId = parts.length >= 6 ? parts[4] : undefined;
    if (!uploaderId || uploaderId !== user.id) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập tệp đính kèm này',
      );
    }
  }

  private assertObjectKeyBelongsToOrganization(
    objectKey: string,
    organizationId: string,
  ): void {
    const parts = objectKey.split('/');
    const scopedOrgId =
      parts[0] === 'organizations' ? parts[1] : parts[0];
    if (!scopedOrgId || scopedOrgId !== organizationId) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập tệp của tổ chức khác',
      );
    }
  }

  private sendSafeFileResponse(
    res: Response,
    options: {
      fullPath: string;
      mimeType: string;
      fileName: string;
      disposition: 'inline' | 'attachment';
      cacheControl: string;
    },
  ): void {
    const encodedName = encodeURIComponent(options.fileName);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', options.cacheControl);
    res.setHeader('Content-Type', options.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${options.disposition}; filename="${options.fileName}"; filename*=UTF-8''${encodedName}`,
    );
    res.sendFile(options.fullPath);
  }
}

