import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Audit Logs')
@ApiBearerAuth('JWT-auth')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @RequirePermissions('audit.view')
  @ApiOperation({
    summary: 'Lấy danh sách nhật ký kiểm toán (API-AUDIT-001)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách nhật ký kiểm toán thành công',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() queryDto: QueryAuditLogDto,
  ) {
    return this.auditLogsService.findAll(user, queryDto);
  }

  @Get(':id')
  @RequirePermissions('audit.view')
  @ApiOperation({
    summary: 'Lấy chi tiết nhật ký kiểm toán theo ID (API-AUDIT-002)',
  })
  @ApiParam({ name: 'id', description: 'Audit Log UUID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết nhật ký kiểm toán thành công',
  })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhật ký kiểm toán' })
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.auditLogsService.findOne(user, id);
  }
}
