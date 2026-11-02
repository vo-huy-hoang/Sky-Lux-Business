import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Max,
  Min,
  IsString,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { DossierStatus } from '../../../common/enums';

export class QuerySupplierDossiersDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Trang hiện tại' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
    description: 'Số lượng phần tử mỗi trang',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo mã tour hoặc tên tour' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: DossierStatus,
    description: 'Lọc theo trạng thái hồ sơ',
  })
  @IsOptional()
  @IsEnum(DossierStatus)
  status?: DossierStatus;

  @ApiPropertyOptional({
    default: true,
    description: 'Chỉ lấy hồ sơ đã hoàn tất/khóa sổ (COMPLETED/LOCKED)',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' || value === true || value === 1 || value === '1',
  )
  @IsBoolean()
  completedOnly?: boolean = true;
}

export interface SupplierDossierHistoryItem {
  dossierId: string;
  dossierCode: string;
  dossierTitle: string;
  departureDate?: string;
  status: DossierStatus | string;
  operatorOrSalesName?: string;
  lineCount: number;
  totalCost: number;
}

