import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsIn,
} from 'class-validator';
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
  limit?: number;

  @ApiPropertyOptional({
    default: 20,
    description: 'Số lượng phần tử mỗi trang (alias cho limit, tối đa 100)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({
    description:
      'Từ khóa tìm kiếm theo tên, mã, số điện thoại, email, mã số thuế, tên liên hệ',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái nhà cung cấp (ACTIVE, INACTIVE, LOCKED)',
    enum: ['ACTIVE', 'INACTIVE', 'LOCKED'],
  })
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE', 'LOCKED'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'ID phân loại nhà cung cấp (UUID)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('all', { message: 'supplierTypeId phải là UUID hợp lệ' })
  @IsOptional()
  supplierTypeId?: string;
}
