import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Settings')
@ApiBearerAuth('JWT-auth')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @ApiOperation({ summary: 'Lấy danh sách cấu hình của tổ chức hiện tại' })
  @Get()
  getSettings(@CurrentUser() user: CurrentUserPayload) {
    return this.settingsService.getOrganizationSettings(user.organizationId);
  }

  @ApiOperation({ summary: 'Lấy giá trị của một cấu hình cụ thể' })
  @Get(':key')
  getSetting(
    @CurrentUser() user: CurrentUserPayload,
    @Param('key') key: string,
  ) {
    return this.settingsService.getOrganizationSetting(user.organizationId, key);
  }

  @ApiOperation({ summary: 'Cập nhật hoặc tạo mới một cấu hình cho tổ chức' })
  @Put(':key')
  updateSetting(
    @CurrentUser() user: CurrentUserPayload,
    @Param('key') key: string,
    @Body() updateSettingDto: UpdateSettingDto,
  ) {
    return this.settingsService.updateOrganizationSetting(
      user.organizationId,
      key,
      updateSettingDto.value,
    );
  }
}
