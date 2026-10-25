import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstimateStatus } from '../../../common/enums';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryEstimateDto extends PaginationQueryDto {
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
