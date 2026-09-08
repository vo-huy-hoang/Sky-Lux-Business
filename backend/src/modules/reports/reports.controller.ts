import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

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
    @Query() query: PaginationQueryDto,
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
