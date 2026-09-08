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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @RequirePermissions('department.manage')
  create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createDepartmentDto: CreateDepartmentDto,
  ) {
    return this.departmentsService.create(organizationId, createDepartmentDto);
  }

  @Get()
  @RequirePermissions('department.view')
  findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.departmentsService.findAll(organizationId, query);
  }

  @Get(':id')
  @RequirePermissions('department.view')
  findOne(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.departmentsService.findOne(organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('department.manage')
  update(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(
      organizationId,
      id,
      updateDepartmentDto,
    );
  }

  @Delete(':id')
  @RequirePermissions('department.manage')
  remove(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.departmentsService.remove(organizationId, id);
  }
}
