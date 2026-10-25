import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseInterceptors,
  UploadedFile,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ImportsService } from './imports.service';
import { UploadImportDto } from './dto/upload-import.dto';
import { QueryImportDto } from './dto/query-import.dto';
import { UpdateImportRowDto } from './dto/update-import-row.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { DossierStatus } from '../../common/enums';

@ApiTags('Imports')
@ApiBearerAuth('JWT-auth')
@Controller('imports')
@RequirePermissions('import.manage')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Tải lên tệp Excel và khởi tạo phiên nhập (API-IMPORT-001)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        templateType: { type: 'string', example: 'ESTIMATE' },
        templateId: { type: 'string', format: 'uuid', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Khởi tạo phiên nhập thành công' })
  upload(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: any, // Express.Multer.File
    @Body() uploadImportDto: UploadImportDto,
  ) {
    return this.importsService.upload(
      organizationId,
      userId,
      file,
      uploadImportDto,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Xem trạng thái phiên nhập dữ liệu (API-IMPORT-002)',
  })
  @ApiResponse({ status: 200, description: 'Lấy trạng thái thành công' })
  findOne(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.importsService.findOne(organizationId, id);
  }

  @Get(':id/preview')
  @ApiOperation({
    summary: 'Xem trước các dòng dữ liệu thô và đã chuẩn hóa (API-IMPORT-003)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách xem trước thành công',
  })
  preview(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() queryDto: QueryImportDto,
  ) {
    return this.importsService.preview(organizationId, id, queryDto);
  }

  @Get(':id/errors')
  @ApiOperation({
    summary:
      'Xem danh sách lỗi kiểm duyệt tương ứng từng dòng (API-IMPORT-004)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách lỗi thành công' })
  errors(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() queryDto: QueryImportDto,
  ) {
    return this.importsService.errors(organizationId, id, queryDto);
  }

  @Patch(':id/rows/:rowId')
  @ApiOperation({
    summary: 'Sửa lỗi thông tin dòng trên bảng tạm (API-IMPORT-005)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật dòng tạm thành công' })
  updateRowStaging(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Body() updateRowDto: UpdateImportRowDto,
  ) {
    return this.importsService.updateRowStaging(
      organizationId,
      id,
      rowId,
      updateRowDto,
    );
  }

  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Yêu cầu chạy lại tiến trình validate dữ liệu (API-IMPORT-006)',
  })
  @ApiResponse({ status: 200, description: 'Kích hoạt validate thành công' })
  validateSession(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.importsService.validateSession(organizationId, id);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Xác nhận nhập dữ liệu hợp lệ chính thức sang hệ thống (API-IMPORT-007)',
  })
  @ApiResponse({ status: 200, description: 'Đồng bộ dữ liệu thành công' })
  confirm(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.importsService.confirm(
      user.organizationId,
      id,
      user.id,
      user.roles.includes('CEO_ADMIN')
        ? DossierStatus.IN_REVIEW
        : user.roles.includes('OPERATOR')
          ? DossierStatus.SUBMITTED
          : DossierStatus.DRAFT,
    );
  }
}
