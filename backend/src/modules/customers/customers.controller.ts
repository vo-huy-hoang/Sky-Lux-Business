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
import { CustomersService } from './customers.service';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Customers')
@ApiBearerAuth('JWT-auth')
@Controller('customers')
@RequirePermissions('customer.manage')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lấy danh sách khách hàng phân trang và tìm kiếm (API-CUSTOMER-001)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findAll(
    @CurrentUser('organizationId') organizationId: string,
    @Query() queryDto: QueryCustomerDto,
  ) {
    return this.customersService.findAll(organizationId, queryDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết khách hàng theo ID (API-CUSTOMER-002)',
  })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  findOne(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.findOne(organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo khách hàng mới (API-CUSTOMER-003)' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  create(
    @CurrentUser('organizationId') organizationId: string,
    @Body() createCustomerDto: CreateCustomerDto,
  ) {
    return this.customersService.create(organizationId, createCustomerDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin khách hàng (API-CUSTOMER-004)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  update(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(organizationId, id, updateCustomerDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa khách hàng (API-CUSTOMER-005)' })
  @ApiResponse({ status: 204, description: 'Xóa thành công' })
  remove(
    @CurrentUser('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.remove(organizationId, id);
  }
}
