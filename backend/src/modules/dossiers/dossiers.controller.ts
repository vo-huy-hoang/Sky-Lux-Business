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
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
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
  @ApiParam({ name: 'id', description: 'Dossier UUID' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
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
  @ApiParam({ name: 'id', description: 'Dossier UUID' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDossierDto: UpdateDossierDto,
  ) {
    return this.dossiersService.update(user, id, updateDossierDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('dossier.update')
  @ApiOperation({ summary: 'Xóa hồ sơ (API-DOSSIER-005)' })
  @ApiParam({ name: 'id', description: 'Dossier UUID' })
  @ApiResponse({ status: 204, description: 'Xóa thành công' })
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dossiersService.remove(user, id);
  }

  @Get(':id/comments')
  @ApiOperation({
    summary: 'Lấy danh sách bình luận của hồ sơ tour (API-COMMENT-001)',
  })
  @ApiParam({ name: 'id', description: 'Dossier UUID' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách bình luận thành công',
  })
  findComments(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.checkViewPermission(user);
    return this.dossiersService.findComments(user, id);
  }

  private checkViewPermission(user: CurrentUserPayload) {
    const hasViewPerm =
      user.permissions.includes('dossier.view.own') ||
      user.permissions.includes('dossier.view.all') ||
      user.permissions.includes('*') ||
      user.roles.includes('SUPER_ADMIN');

    if (!hasViewPerm) {
      throw new ForbiddenException(
        'Access denied: Yêu cầu quyền xem hồ sơ (dossier.view.own hoặc dossier.view.all)',
      );
    }
  }
}
