import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Permissions')
@ApiBearerAuth('JWT-auth')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('role.manage')
  @ApiOperation({
    summary: 'Lấy danh sách tất cả các quyền hạn hệ thống (API-RBAC-004)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách quyền hạn thành công' })
  findAll() {
    return this.permissionsService.findAll();
  }
}
