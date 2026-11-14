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
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { BatchCreateSuppliersDto } from './dto/batch-create-suppliers.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDossiersDto } from './dto/query-supplier-dossiers.dto';
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
  @ApiResponse({ status: 401, description: 'Chưa xác thực JWT' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() queryDto: QuerySupplierDto,
  ) {
    return this.suppliersService.findAll(user, queryDto);
  }

  @Get(':id/dossiers')
  @RequirePermissions('supplier.view')
  @ApiOperation({
    summary:
      'Lấy lịch sử các tour/hồ sơ đã phát sinh chi phí với nhà cung cấp (API-SUPPLIER-006)',
  })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  @ApiResponse({ status: 400, description: 'ID không đúng định dạng UUID' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực JWT' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhà cung cấp' })
  getSupplierDossiers(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() queryDto: QuerySupplierDossiersDto,
  ) {
    return this.suppliersService.getSupplierDossierHistory(user, id, queryDto);
  }

  @Get(':id')
  @RequirePermissions('supplier.manage')
  @ApiOperation({
    summary: 'Lấy chi tiết nhà cung cấp theo ID (API-SUPPLIER-002)',
  })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  @ApiResponse({ status: 400, description: 'ID không đúng định dạng UUID' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực JWT' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhà cung cấp' })
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.suppliersService.findOne(user, id);
  }

  @Post('batch')
  @RequirePermissions('supplier.manage')
  @ApiOperation({
    summary: 'Nhập hàng loạt nhà cung cấp trong một giao dịch (API-SUPPLIER-BATCH)',
  })
  @ApiResponse({ status: 201, description: 'Nhập hàng loạt thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực JWT' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 409, description: 'Trùng lặp mã nhà cung cấp' })
  batchCreate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() batchCreateSuppliersDto: BatchCreateSuppliersDto,
  ) {
    return this.suppliersService.batchCreate(user, batchCreateSuppliersDto);
  }

  @Post()
  @RequirePermissions('supplier.manage')
  @ApiOperation({ summary: 'Tạo nhà cung cấp mới (API-SUPPLIER-003)' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực JWT' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 409, description: 'Mã nhà cung cấp đã tồn tại' })
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
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực JWT' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhà cung cấp' })
  @ApiResponse({ status: 409, description: 'Mã nhà cung cấp bị trùng' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(user, id, updateSupplierDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('supplier.manage')
  @ApiOperation({ summary: 'Xóa mềm nhà cung cấp (API-SUPPLIER-005)' })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @ApiResponse({ status: 204, description: 'Xóa thành công' })
  @ApiResponse({ status: 400, description: 'ID không đúng định dạng UUID' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực JWT' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy nhà cung cấp' })
  @ApiResponse({
    status: 409,
    description: 'Không thể xóa do đang có ràng buộc dữ liệu',
  })
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.suppliersService.remove(user, id);
  }
}
