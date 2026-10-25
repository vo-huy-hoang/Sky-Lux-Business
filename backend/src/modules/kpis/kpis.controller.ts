import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { KpisService } from './kpis.service';
import { QueryMyKpiDto } from './dto/query-my-kpi.dto';
import { QueryKpisDto } from './dto/query-kpis.dto';
import { CreateKpiTargetDto } from './dto/create-kpi-target.dto';
import { UpdateKpiTargetDto } from './dto/update-kpi-target.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('KPIs')
@ApiBearerAuth('JWT-auth')
@Controller('kpis')
export class KpisController {
  constructor(private readonly kpisService: KpisService) {}

  @Get('me')
  @RequirePermissions('kpi.view')
  @ApiOperation({ summary: 'Xem KPI cá nhân của Sales (API-KPI-001)' })
  @ApiResponse({ status: 200, description: 'Lấy KPI cá nhân thành công' })
  findMyKpi(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Query() queryDto: QueryMyKpiDto,
  ) {
    return this.kpisService.findMyKpi(organizationId, userId, queryDto);
  }

  @Get()
  @RequirePermissions('kpi.view')
  @ApiOperation({ summary: 'Lấy danh sách KPI (API-KPI-002)' })
  findAllKpis(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('departmentId') departmentId: string,
    @CurrentUser('roles') roles: string[],
    @CurrentUser('permissions') permissions: string[],
    @Query() queryDto: QueryKpisDto,
  ) {
    return this.kpisService.findAllKpis(organizationId, queryDto, {
      userId,
      departmentId,
      roles,
      permissions,
    });
  }

  @Get('sales')
  @RequirePermissions('kpi.view')
  @ApiOperation({ summary: 'Lấy danh sách KPI của Sales (API-KPI-005)' })
  findSalesKpis(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('departmentId') departmentId: string,
    @CurrentUser('roles') roles: string[],
    @CurrentUser('permissions') permissions: string[],
    @Query() queryDto: QueryKpisDto,
  ) {
    return this.kpisService.findSalesKpis(organizationId, queryDto, {
      userId,
      departmentId,
      roles,
      permissions,
    });
  }

  @Get('assignees')
  @RequirePermissions('kpi.manage')
  @ApiOperation({ summary: 'Lấy danh sách Sales có thể giao KPI' })
  findAssignableUsers(@CurrentUser('organizationId') organizationId: string) {
    return this.kpisService.findAssignableUsers(organizationId);
  }

  @Post('targets')
  @RequirePermissions('kpi.manage')
  @ApiOperation({ summary: 'Tạo target KPI mới (API-KPI-003)' })
  createKpiTarget(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') creatorId: string,
    @Body() createDto: CreateKpiTargetDto,
  ) {
    return this.kpisService.createKpiTarget(
      organizationId,
      creatorId,
      createDto,
    );
  }

  @Patch('targets/:id')
  @RequirePermissions('kpi.manage')
  @ApiOperation({ summary: 'Cập nhật target KPI (API-KPI-004)' })
  updateKpiTarget(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateKpiTargetDto,
  ) {
    return this.kpisService.updateKpiTarget(organizationId, id, updateDto);
  }
}
