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

  @Get('operator/sales-summary')
  @RequirePermissions('dashboard.operator')
  @ApiOperation({
    summary: 'Tổng hợp hiệu suất và doanh thu theo Sales (API-DASHBOARD-004)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy tổng hợp theo Sales thành công',
  })
  getOperatorSalesSummary(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.dashboardsService.getOperatorSalesSummary(organizationId);
  }

  @Get('operator/monthly-trend')
  @RequirePermissions('dashboard.operator')
  @ApiOperation({
    summary: 'Xu hướng tạo hồ sơ và doanh thu theo tháng (API-DASHBOARD-005)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy xu hướng theo tháng thành công',
  })
  getOperatorMonthlyTrend(
    @CurrentUser('organizationId') organizationId: string,
    @Query('months') months?: number,
  ) {
    return this.dashboardsService.getOperatorMonthlyTrend(
      organizationId,
      months ? Number(months) : 6,
    );
  }

  @Get('ceo/monthly-trend')
  @RequirePermissions('dashboard.ceo')
  @ApiOperation({
    summary: 'Xu hướng doanh thu, chi phí, lợi nhuận 12 tháng theo năm cho CEO (API-DASHBOARD-006)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy xu hướng 12 tháng theo năm cho CEO thành công',
  })
  getCeoMonthlyTrend(
    @CurrentUser('organizationId') organizationId: string,
    @Query('year') year?: number,
  ) {
    return this.dashboardsService.getCeoMonthlyTrend(
      organizationId,
      year ? Number(year) : new Date().getFullYear(),
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

