import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '../../../common/enums';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryTaskDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID hồ sơ vụ việc',
  })
  @IsUUID('all', { message: 'ID hồ sơ vụ việc phải là UUID hợp lệ' })
  @IsOptional()
  dossierId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID người được giao việc',
  })
  @IsUUID('all', { message: 'ID người được giao việc phải là UUID hợp lệ' })
  @IsOptional()
  assignedTo?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái công việc',
    enum: TaskStatus,
  })
  @IsEnum(TaskStatus, { message: 'Trạng thái không hợp lệ' })
  @IsOptional()
  status?: TaskStatus;
}
