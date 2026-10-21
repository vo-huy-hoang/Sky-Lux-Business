import { IsOptional, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { KpiPeriodType } from '../../../common/enums';

export class QueryDashboardDto {
  @IsOptional()
  @IsEnum(KpiPeriodType)
  periodType?: KpiPeriodType = KpiPeriodType.MONTHLY;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  allTime?: boolean;
}
