import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { KpiPeriodType } from '../../../common/enums';

export class QueryMyKpiDto {
  @IsOptional()
  @IsEnum(KpiPeriodType)
  periodType?: KpiPeriodType = KpiPeriodType.MONTHLY;

  @IsOptional()
  @IsDateString()
  date?: string;
}
