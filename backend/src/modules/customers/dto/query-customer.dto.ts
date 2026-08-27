import { IsOptional, IsString, IsInt, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerType } from '../../../common/enums';

export class QueryCustomerDto {
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
      'Từ khóa tìm kiếm theo mã, tên hiển thị, sđt hoặc email khách hàng',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo loại khách hàng (Cá nhân, Công ty, Tổ chức)',
    enum: CustomerType,
  })
  @IsEnum(CustomerType, { message: 'Loại khách hàng không hợp lệ' })
  @IsOptional()
  customerType?: CustomerType;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái hoạt động (e.g. ACTIVE, INACTIVE)',
  })
  @IsString()
  @IsOptional()
  status?: string;
}
