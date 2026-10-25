import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportExportDto } from './dto/report-export.dto';
import { ReportQueryDto } from './dto/report-query.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  @RequirePermissions('report.view')
  @ApiOperation({ summary: 'Báo cáo doanh thu (API-REPORT-001)' })
  @ApiResponse({ status: 200, description: 'Lấy báo cáo doanh thu thành công' })
  getRevenue(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('departmentId') departmentId: string,
    @CurrentUser('roles') roles: string[],
    @CurrentUser('permissions') permissions: string[],
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getRevenueReport(organizationId, query, {
      userId,
      departmentId,
      roles,
      permissions,
    });
  }

  @Get('sales-performance')
  @RequirePermissions('report.view')
  @ApiOperation({ summary: 'Báo cáo hiệu suất Sales (API-REPORT-002)' })
  getSalesPerformance(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('departmentId') departmentId: string,
    @CurrentUser('roles') roles: string[],
    @CurrentUser('permissions') permissions: string[],
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getSalesPerformanceReport(
      organizationId,
      query,
      {
        userId,
        departmentId,
        roles,
        permissions,
      },
    );
  }

  @Get('customer')
  @RequirePermissions('report.view')
  @ApiOperation({ summary: 'Báo cáo khách hàng (API-REPORT-003)' })
  getCustomer(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('departmentId') departmentId: string,
    @CurrentUser('roles') roles: string[],
    @CurrentUser('permissions') permissions: string[],
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getCustomerReport(organizationId, query, {
      userId,
      departmentId,
      roles,
      permissions,
    });
  }

  @Get('supplier')
  @RequirePermissions('report.view')
  @ApiOperation({ summary: 'Báo cáo nhà cung cấp (API-REPORT-004)' })
  getSupplier(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('departmentId') departmentId: string,
    @CurrentUser('roles') roles: string[],
    @CurrentUser('permissions') permissions: string[],
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getSupplierReport(organizationId, query, {
      userId,
      departmentId,
      roles,
      permissions,
    });
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('report.export')
  @ApiOperation({ summary: 'Xuất báo cáo XLSX/CSV/PDF (API-REPORT-005)' })
  @ApiResponse({ status: 200, description: 'File báo cáo được tạo thành công' })
  async export(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('departmentId') departmentId: string,
    @CurrentUser('roles') roles: string[],
    @CurrentUser('permissions') permissions: string[],
    @Body() request: ReportExportDto,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.reportsService.exportReport(
      organizationId,
      userId,
      request,
      { userId, departmentId, roles, permissions },
    );
    response.setHeader('Content-Type', result.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    response.setHeader('X-Report-Row-Count', String(result.rowCount));
    response.status(HttpStatus.OK).send(result.buffer);
  }

  @Post()
  @RequirePermissions('report.manage')
  create(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Body() createReportDto: CreateReportDto,
  ) {
    return this.reportsService.create(organizationId, userId, createReportDto);
  }

  @Get()
  @RequirePermissions('report.view')
  findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.findAll(organizationId, query);
  }

  @Get(':id')
  @RequirePermissions('report.view')
  findOne(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportsService.findOne(organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('report.manage')
  update(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReportDto: UpdateReportDto,
  ) {
    return this.reportsService.update(organizationId, id, updateReportDto);
  }

  @Delete(':id')
  @RequirePermissions('report.manage')
  remove(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reportsService.remove(organizationId, id);
  }
}
