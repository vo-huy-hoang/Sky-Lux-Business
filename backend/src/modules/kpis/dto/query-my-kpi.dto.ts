import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { KpiPeriodType } from '../../../common/enums';

export class QueryMyKpiDto {
  @ApiPropertyOptional({ enum: KpiPeriodType, default: KpiPeriodType.MONTHLY })
  @IsOptional()
  @IsEnum(KpiPeriodType)
  periodType?: KpiPeriodType = KpiPeriodType.MONTHLY;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu của kỳ KPI' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc của kỳ KPI' })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  /** @deprecated Dùng periodStart/periodEnd thay cho date. */
  @ApiPropertyOptional({ description: 'Ngày tham chiếu cũ để tương thích client' })
  @IsOptional()
  @IsDateString()
  date?: string;
}
