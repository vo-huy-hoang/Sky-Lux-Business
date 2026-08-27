import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MasterDataService } from './master-data.service';
import { MasterDataQueryDto } from './dto/master-data-query.dto';
import { PaginatedMasterDataResponseDto } from './dto/master-data-response.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Master Data')
@ApiBearerAuth('JWT-auth')
@Controller('master-data')
@RequirePermissions('master_data.view')
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get('business-lines')
  @ApiOperation({
    summary: 'Danh mục mảng kinh doanh (API-MASTER-001)',
    description: 'Lấy danh sách mảng kinh doanh có hỗ trợ lọc và phân trang',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách mảng kinh doanh thành công',
    type: PaginatedMasterDataResponseDto,
  })
  getBusinessLines(
    @Query() query: MasterDataQueryDto,
  ): Promise<PaginatedMasterDataResponseDto> {
    return this.masterDataService.getBusinessLines(query);
  }

  @Get('market-types')
  @ApiOperation({
    summary: 'Danh mục loại thị trường (API-MASTER-002)',
    description: 'Lấy danh sách loại thị trường có hỗ trợ lọc và phân trang',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách loại thị trường thành công',
    type: PaginatedMasterDataResponseDto,
  })
  getMarketTypes(
    @Query() query: MasterDataQueryDto,
  ): Promise<PaginatedMasterDataResponseDto> {
    return this.masterDataService.getMarketTypes(query);
  }

  @Get('service-categories')
  @ApiOperation({
    summary: 'Danh mục nhóm dịch vụ (API-MASTER-003)',
    description: 'Lấy danh sách nhóm dịch vụ có hỗ trợ lọc và phân trang',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách nhóm dịch vụ thành công',
    type: PaginatedMasterDataResponseDto,
  })
  getServiceCategories(
    @Query() query: MasterDataQueryDto,
  ): Promise<PaginatedMasterDataResponseDto> {
    return this.masterDataService.getServiceCategories(query);
  }

  @Get('passenger-types')
  @ApiOperation({
    summary: 'Danh mục loại khách (API-MASTER-004)',
    description: 'Lấy danh sách loại khách có hỗ trợ lọc và phân trang',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách loại khách thành công',
    type: PaginatedMasterDataResponseDto,
  })
  getPassengerTypes(
    @Query() query: MasterDataQueryDto,
  ): Promise<PaginatedMasterDataResponseDto> {
    return this.masterDataService.getPassengerTypes(query);
  }

  @Get('supplier-types')
  @ApiOperation({
    summary: 'Danh mục loại nhà cung cấp (API-MASTER-005)',
    description: 'Lấy danh sách loại nhà cung cấp có hỗ trợ lọc và phân trang',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách loại nhà cung cấp thành công',
    type: PaginatedMasterDataResponseDto,
  })
  getSupplierTypes(
    @Query() query: MasterDataQueryDto,
  ): Promise<PaginatedMasterDataResponseDto> {
    return this.masterDataService.getSupplierTypes(query);
  }

  @Get('units')
  @ApiOperation({
    summary: 'Danh mục đơn vị tính (API-MASTER-006)',
    description: 'Lấy danh sách đơn vị tính có hỗ trợ lọc và phân trang',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách đơn vị tính thành công',
    type: PaginatedMasterDataResponseDto,
  })
  getUnits(
    @Query() query: MasterDataQueryDto,
  ): Promise<PaginatedMasterDataResponseDto> {
    return this.masterDataService.getUnits(query);
  }
}
