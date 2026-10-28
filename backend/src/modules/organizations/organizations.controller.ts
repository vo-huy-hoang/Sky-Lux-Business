import {
  Controller,
  Get,
  Patch,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Post,
  Delete,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateSettingDto } from '../settings/dto/update-setting.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Organization')
@ApiBearerAuth('JWT-auth')
@Controller('organization')
@RequirePermissions('organization.manage')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('all')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Lấy danh sách tổ chức để SUPER_ADMIN chọn' })
  findAll(@CurrentUser('roles') roles: string[]) {
    this.assertSuperAdmin(roles);
    return this.organizationsService.findAll();
  }

  @Post()
  @RequirePermissions()
  @ApiOperation({ summary: 'Tạo tổ chức mới (người dùng đã đăng nhập)' })
  @ApiResponse({ status: 201, description: 'Tạo tổ chức thành công' })
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(dto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'SUPER_ADMIN cập nhật thông tin doanh nghiệp' })
  updateOrganization(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateOrganizationDto,
    @CurrentUser('roles') roles: string[],
  ) {
    this.assertSuperAdmin(roles);
    return this.organizationsService.updateOrganization(id, updateDto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'SUPER_ADMIN xóa mềm doanh nghiệp' })
  removeOrganization(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('roles') roles: string[],
  ) {
    this.assertSuperAdmin(roles);
    return this.organizationsService.removeOrganization(id);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy thông tin chi tiết tổ chức (API-ORG-001)' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công' })
  getProfile(@CurrentUser('organizationId') organizationId: string) {
    return this.organizationsService.getProfile(organizationId);
  }

  @Patch()
  @ApiOperation({ summary: 'Cập nhật thông tin tổ chức (API-ORG-002)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  updateProfile(
    @CurrentUser('organizationId') organizationId: string,
    @Body() updateDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.updateProfile(organizationId, updateDto);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Lấy danh sách cấu hình tổ chức (API-ORG-003)' })
  @ApiResponse({ status: 200, description: 'Lấy cấu hình thành công' })
  getSettings(@CurrentUser('organizationId') organizationId: string) {
    return this.organizationsService.getSettings(organizationId);
  }

  @Put('settings/:key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật cấu hình tổ chức theo key (API-ORG-004)' })
  @ApiResponse({ status: 200, description: 'Cập nhật cấu hình thành công' })
  updateSetting(
    @CurrentUser('organizationId') organizationId: string,
    @Param('key') key: string,
    @Body() updateSettingDto: UpdateSettingDto,
  ) {
    return this.organizationsService.updateSetting(
      organizationId,
      key,
      updateSettingDto.value,
    );
  }

  private assertSuperAdmin(roles: string[] = []) {
    // RolesGuard treats both admin roles as global bypass roles, so enforce
    // this endpoint's narrower authorization explicitly as well.
    if (!roles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException(
        'Chỉ SUPER_ADMIN được phép thực hiện thao tác này',
      );
    }
  }
}
