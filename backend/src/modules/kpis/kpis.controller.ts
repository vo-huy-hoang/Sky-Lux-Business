import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { KpisService } from './kpis.service';
import { QueryMyKpiDto } from './dto/query-my-kpi.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('KPIs')
@ApiBearerAuth('JWT-auth')
@Controller('kpis')
export class KpisController {
  constructor(private readonly kpisService: KpisService) {}

  @Get('me')
  @ApiOperation({ summary: 'Xem KPI cá nhân của Sales (API-KPI-001)' })
  @ApiResponse({ status: 200, description: 'Lấy KPI cá nhân thành công' })
  findMyKpi(
    @CurrentUser('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Query() queryDto: QueryMyKpiDto,
  ) {
    return this.kpisService.findMyKpi(organizationId, userId, queryDto);
  }
}
