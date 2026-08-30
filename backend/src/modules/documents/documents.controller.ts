import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { DownloadUrlQueryDto } from './dto/download-url-query.dto';
import { CreateDocumentVersionDto } from './dto/create-document-version.dto';

@ApiTags('Documents')
@ApiBearerAuth('JWT-auth')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':id')
  @RequirePermissions('document.view')
  @ApiOperation({ summary: 'Lấy chi tiết tài liệu theo ID (API-DOCUMENT-003)' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết tài liệu thành công' })
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.findOne(user, id);
  }

  @Delete(':id')
  @RequirePermissions('document.manage')
  @ApiOperation({ summary: 'Xóa tài liệu (API-DOCUMENT-004)' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Xóa tài liệu thành công' })
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.remove(user, id);
  }

  @Get(':id/download-url')
  @RequirePermissions('document.view')
  @ApiOperation({
    summary: 'Lấy presigned download URL của tài liệu (API-DOCUMENT-005)',
  })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Tạo URL tải về thành công' })
  getDownloadUrl(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DownloadUrlQueryDto,
  ) {
    return this.documentsService.getDownloadUrl(user, id, query);
  }

  @Get(':id/versions')
  @ApiOperation({
    summary: 'Lấy danh sách các phiên bản của tài liệu (API-DOCVER-001)',
  })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách phiên bản thành công',
  })
  findVersions(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documentsService.findVersions(user, id);
  }

  @Post(':id/versions')
  @RequirePermissions('dossier.update')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Tải lên phiên bản mới cho tài liệu (API-DOCVER-002)',
  })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        changeNote: { type: 'string', example: 'Bổ sung phụ lục hợp đồng' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Tải lên phiên bản mới thành công' })
  createVersion(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentVersionDto,
  ) {
    return this.documentsService.createVersion(user, id, file, dto);
  }
}
