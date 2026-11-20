import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export enum ReportDateBasis {
  LOCKED_AT = 'lockedAt',
  APPROVED_AT = 'approvedAt',
}

export class ReportQueryDto {
  @ApiPropertyOptional({ description: 'Ngày bắt đầu kỳ báo cáo (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc kỳ báo cáo (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional({
    enum: ReportDateBasis,
    default: ReportDateBasis.LOCKED_AT,
    description:
      'Mốc ghi nhận kỳ báo cáo: lockedAt (kỳ khóa sổ kế toán, mặc định) hoặc approvedAt (kỳ phê duyệt vận hành)',
  })
  @IsOptional()
  @IsEnum(ReportDateBasis)
  dateBasis?: ReportDateBasis;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({ description: 'Tìm theo mã/tên đối tượng báo cáo' })
  @IsOptional()
  @IsString()
  search?: string;
}
