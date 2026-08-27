import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardsService } from './dashboards.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Dashboards')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get('sales')
  @RequirePermissions('dashboard.sales')
  @ApiOperation({ summary: 'Xem Dashboard Sales (API-DASHBOARD-001)' })
  @ApiResponse({
    status: 200,
    description: 'Lấy dữ liệu dashboard sales thành công',
  })
  getSalesDashboard(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Query() queryDto: QueryDashboardDto,
  ) {
    return this.dashboardsService.getSalesDashboard(
      organizationId,
      userId,
      queryDto,
    );
  }

  @Get('operator')
  @RequirePermissions('dashboard.operator')
  @ApiOperation({ summary: 'Xem Dashboard Operator (API-DASHBOARD-002)' })
  @ApiResponse({
    status: 200,
    description: 'Lấy dữ liệu dashboard operator thành công',
  })
  getOperatorDashboard(
    @CurrentUser('organizationId') organizationId: string,
    @Query() queryDto: QueryDashboardDto,
  ) {
    return this.dashboardsService.getOperatorDashboard(
      organizationId,
      queryDto,
    );
  }

  @Get('ceo')
  @RequirePermissions('dashboard.ceo')
  @ApiOperation({ summary: 'Xem Dashboard CEO (API-DASHBOARD-003)' })
  @ApiResponse({
    status: 200,
    description: 'Lấy dữ liệu dashboard ceo thành công',
  })
  getCeoDashboard(
    @CurrentUser('organizationId') organizationId: string,
    @Query() queryDto: QueryDashboardDto,
  ) {
    return this.dashboardsService.getCeoDashboard(organizationId, queryDto);
  }
}
