import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsUUID,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';
import { KpiMetric, KpiPeriodType } from '../../../common/enums';
import { Type } from 'class-transformer';

export class CreateKpiTargetDto {
  @ApiProperty({ enum: KpiMetric })
  @IsNotEmpty()
  @IsEnum(KpiMetric)
  metricCode: KpiMetric;

  @ApiProperty({ enum: KpiPeriodType })
  @IsNotEmpty()
  @IsEnum(KpiPeriodType)
  periodType: KpiPeriodType;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  periodStart: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  periodEnd: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID('4')
  userId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  targetValue: number;
}
