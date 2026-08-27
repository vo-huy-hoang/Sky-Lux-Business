import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QuerySupplierDto {
  @ApiPropertyOptional({ default: 1, description: 'Số trang hiện tại' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({
    default: 20,
    description: 'Số lượng phần tử mỗi trang (tối đa 100)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 20;

  @ApiPropertyOptional({
    description:
      'Từ khóa tìm kiếm theo tên, mã, email, số điện thoại nhà cung cấp',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái nhà cung cấp (ACTIVE, INACTIVE, LOCKED)',
  })
  @IsString()
  @IsOptional()
  status?: string;
}
