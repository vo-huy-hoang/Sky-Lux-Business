import {
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
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DossiersService } from './dossiers.service';
import { QueryDossierDto } from './dto/query-dossier.dto';
import { CreateDossierDto } from './dto/create-dossier.dto';
import { UpdateDossierDto } from './dto/update-dossier.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Dossiers')
@ApiBearerAuth('JWT-auth')
@Controller('dossiers')
export class DossiersController {
  constructor(private readonly dossiersService: DossiersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách hồ sơ phân trang và tìm kiếm (API-DOSSIER-001)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() queryDto: QueryDossierDto,
  ) {
    this.checkViewPermission(user);
    return this.dossiersService.findAll(user, queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết hồ sơ theo ID (API-DOSSIER-002)' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    this.checkViewPermission(user);
    return this.dossiersService.findOne(user, id);
  }

  @Post()
  @RequirePermissions('dossier.create')
  @ApiOperation({ summary: 'Tạo hồ sơ mới (API-DOSSIER-003)' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() createDossierDto: CreateDossierDto,
  ) {
    return this.dossiersService.create(user, createDossierDto);
  }

  @Patch(':id')
  @RequirePermissions('dossier.update')
  @ApiOperation({ summary: 'Cập nhật thông tin hồ sơ (API-DOSSIER-004)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() updateDossierDto: UpdateDossierDto,
  ) {
    return this.dossiersService.update(user, id, updateDossierDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('dossier.update')
  @ApiOperation({ summary: 'Xóa hồ sơ (API-DOSSIER-005)' })
  @ApiResponse({ status: 204, description: 'Xóa thành công' })
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.dossiersService.remove(user, id);
  }

  private checkViewPermission(user: CurrentUserPayload) {
    const hasViewPerm =
      user.permissions.includes('dossier.view.own') ||
      user.permissions.includes('dossier.view.all') ||
      user.permissions.includes('*') ||
      user.roles.includes('SUPER_ADMIN'); // fallback support for system admin bypass

    if (!hasViewPerm) {
      throw new ForbiddenException(
        'Access denied: Yêu cầu quyền xem hồ sơ (dossier.view.own hoặc dossier.view.all)',
      );
    }
  }
}
