import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { QueryPermissionDto } from './dto/query-permission.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('RBAC - Roles & Permissions')
@ApiBearerAuth('JWT-auth')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('user.manage')
  @ApiOperation({
    summary: 'Lấy danh sách tất cả các quyền trong hệ thống (API-RBAC-004)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách quyền kèm phân nhóm theo module',
  })
  findAll(@Query() query: QueryPermissionDto) {
    return this.permissionsService.findAll(query);
  }
}
