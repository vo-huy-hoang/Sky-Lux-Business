import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryPermissionDto {
  @ApiPropertyOptional({ default: 1, description: 'Số trang' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 100, description: 'Số lượng item mỗi trang' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo mã, tên hoặc mô tả',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo phân hệ (module, VD: DOSSIER, ESTIMATE, CRM, TASK)',
  })
  @IsString()
  @IsOptional()
  module?: string;
}
