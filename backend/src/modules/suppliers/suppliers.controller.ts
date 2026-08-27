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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Suppliers')
@ApiBearerAuth('JWT-auth')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @RequirePermissions('supplier.manage')
  @ApiOperation({
    summary: 'Lấy danh sách nhà cung cấp phân trang và lọc (API-SUPPLIER-001)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() queryDto: QuerySupplierDto,
  ) {
    return this.suppliersService.findAll(user, queryDto);
  }

  @Get(':id')
  @RequirePermissions('supplier.manage')
  @ApiOperation({
    summary: 'Lấy chi tiết nhà cung cấp theo ID (API-SUPPLIER-002)',
  })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.suppliersService.findOne(user, id);
  }

  @Post()
  @RequirePermissions('supplier.manage')
  @ApiOperation({ summary: 'Tạo nhà cung cấp mới (API-SUPPLIER-003)' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() createSupplierDto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(user, createSupplierDto);
  }

  @Patch(':id')
  @RequirePermissions('supplier.manage')
  @ApiOperation({
    summary: 'Cập nhật thông tin nhà cung cấp (API-SUPPLIER-004)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(user, id, updateSupplierDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('supplier.manage')
  @ApiOperation({ summary: 'Xóa nhà cung cấp (API-SUPPLIER-005)' })
  @ApiResponse({ status: 204, description: 'Xóa thành công' })
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.suppliersService.remove(user, id);
  }
}
