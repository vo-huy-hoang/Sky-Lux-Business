import {
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstimateStatus } from '../../../common/enums';

export class QueryEstimateDto {
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
    description: 'Từ khóa tìm kiếm theo ghi chú hoặc mô tả',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID hồ sơ vụ việc',
  })
  @IsUUID('all', { message: 'ID hồ sơ vụ việc phải là định dạng UUID hợp lệ' })
  @IsOptional()
  dossierId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái báo giá',
    enum: EstimateStatus,
  })
  @IsEnum(EstimateStatus, { message: 'Trạng thái không hợp lệ' })
  @IsOptional()
  status?: EstimateStatus;
}
