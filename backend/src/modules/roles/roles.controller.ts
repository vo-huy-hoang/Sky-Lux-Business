import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('RBAC - Roles & Permissions')
@ApiBearerAuth('JWT-auth')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Lấy danh sách các vai trò (API-RBAC-001)' })
  @ApiResponse({ status: 200, description: 'Danh sách vai trò kèm phân trang' })
  findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: QueryRoleDto,
  ) {
    return this.rolesService.findAll(organizationId, query);
  }

  @Post()
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Tạo vai trò mới trong tổ chức (API-RBAC-002)' })
  @ApiResponse({ status: 201, description: 'Tạo vai trò thành công' })
  @ApiResponse({ status: 409, description: 'Mã vai trò đã tồn tại' })
  create(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorUserId: string,
    @Body() createRoleDto: CreateRoleDto,
  ) {
    return this.rolesService.create(organizationId, createRoleDto, actorUserId);
  }

  @Get(':id')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Lấy chi tiết vai trò kèm danh sách quyền' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Chi tiết vai trò' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vai trò' })
  findOne(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rolesService.findOne(organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Cập nhật thông tin vai trò (API-RBAC-003)' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Cập nhật vai trò thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vai trò' })
  update(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.rolesService.update(
      organizationId,
      id,
      updateRoleDto,
      actorUserId,
    );
  }

  @Put(':id/permissions')
  @RequirePermissions('user.manage')
  @ApiOperation({ summary: 'Gán danh sách quyền cho vai trò (API-RBAC-005)' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 200, description: 'Gán quyền thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vai trò' })
  assignPermissions(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') actorUserId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(
      organizationId,
      id,
      assignPermissionsDto.permissionCodes,
      actorUserId,
    );
  }
}
