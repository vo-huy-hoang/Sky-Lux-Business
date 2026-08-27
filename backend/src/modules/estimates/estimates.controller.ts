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
import { EstimatesService } from './estimates.service';
import { QueryEstimateDto } from './dto/query-estimate.dto';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Estimates')
@ApiBearerAuth('JWT-auth')
@Controller('estimates')
export class EstimatesController {
  constructor(private readonly estimatesService: EstimatesService) {}

  @Get()
  @RequirePermissions('estimate.view')
  @ApiOperation({
    summary: 'Lấy danh sách báo giá phân trang và lọc (API-ESTIMATE-001)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() queryDto: QueryEstimateDto,
  ) {
    return this.estimatesService.findAll(user, queryDto);
  }

  @Get(':id')
  @RequirePermissions('estimate.view')
  @ApiOperation({ summary: 'Lấy chi tiết báo giá theo ID (API-ESTIMATE-002)' })
  @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.estimatesService.findOne(user, id);
  }

  @Post()
  @RequirePermissions('estimate.create')
  @ApiOperation({ summary: 'Tạo bản báo giá mới (API-ESTIMATE-003)' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() createEstimateDto: CreateEstimateDto,
  ) {
    return this.estimatesService.create(user, createEstimateDto);
  }

  @Patch(':id')
  @RequirePermissions('estimate.update')
  @ApiOperation({
    summary: 'Cập nhật thông tin bản báo giá (API-ESTIMATE-004)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() updateEstimateDto: UpdateEstimateDto,
  ) {
    return this.estimatesService.update(user, id, updateEstimateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('estimate.update')
  @ApiOperation({ summary: 'Xóa bản báo giá (API-ESTIMATE-005)' })
  @ApiResponse({ status: 204, description: 'Xóa thành công' })
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.estimatesService.remove(user, id);
  }
}
