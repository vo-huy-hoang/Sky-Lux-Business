import {
  Controller,
  Get,
  Patch,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
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

@ApiTags('Organization')
@ApiBearerAuth('JWT-auth')
@Controller('organization')
@RequirePermissions('organization.manage')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

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
}
