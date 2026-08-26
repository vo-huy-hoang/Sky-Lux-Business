import {
  Put,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Roles')
@ApiBearerAuth('JWT-auth')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('role.manage')
  @ApiOperation({ summary: 'Tạo vai trò mới (API-RBAC-002)' })
  @ApiResponse({ status: 201, description: 'Tạo vai trò thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 409, description: 'Trùng mã vai trò' })
  create(
    @Body() createRoleDto: CreateRoleDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.rolesService.create(createRoleDto, organizationId);
  }

  @Get()
  @RequirePermissions('role.manage')
  @ApiOperation({ summary: 'Lấy danh sách vai trò của tổ chức (API-RBAC-001)' })
  @ApiResponse({ status: 200, description: 'Danh sách vai trò' })
  findAll(@CurrentUser('organizationId') organizationId: string) {
    return this.rolesService.findAll(organizationId);
  }

  @Get(':id')
  @RequirePermissions('role.manage')
  @ApiOperation({ summary: 'Lấy chi tiết vai trò kèm danh sách quyền' })
  @ApiResponse({ status: 200, description: 'Chi tiết vai trò' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vai trò' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.rolesService.findOne(id, organizationId);
  }

  @Patch(':id')
  @RequirePermissions('role.manage')
  @ApiOperation({ summary: 'Cập nhật thông tin vai trò (API-RBAC-003)' })
  @ApiResponse({ status: 200, description: 'Cập nhật vai trò thành công' })
  @ApiResponse({
    status: 400,
    description: 'Vai trò hệ thống hoặc dữ liệu sai',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vai trò' })
  update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.rolesService.update(id, updateRoleDto, organizationId);
  }

  @Delete(':id')
  @RequirePermissions('role.manage')
  @ApiOperation({ summary: 'Xóa vai trò với xác nhận cảnh báo thông minh' })
  @ApiQuery({
    name: 'force',
    type: Boolean,
    required: false,
    description: 'Bắt buộc xóa gỡ liên kết',
  })
  @ApiResponse({ status: 200, description: 'Xóa vai trò thành công' })
  @ApiResponse({
    status: 400,
    description: 'Vai trò đang gán cho nhân viên (cần force=true)',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vai trò' })
  remove(
    @Param('id') id: string,
    @CurrentUser('organizationId') organizationId: string,
    @Query('force') force?: string,
  ) {
    const isForce = force === 'true';
    return this.rolesService.remove(id, organizationId, isForce);
  }

  @Put(':id/permissions')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('role.manage')
  @ApiOperation({
    summary: 'Gán và đồng bộ quyền hạn cho vai trò (API-RBAC-005)',
  })
  @ApiResponse({ status: 200, description: 'Gán quyền thành công' })
  @ApiResponse({
    status: 400,
    description: 'Vai trò hệ thống hoặc dữ liệu sai',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy vai trò' })
  assignPermissions(
    @Param('id') id: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.rolesService.assignPermissions(
      id,
      assignPermissionsDto,
      organizationId,
    );
  }
}
