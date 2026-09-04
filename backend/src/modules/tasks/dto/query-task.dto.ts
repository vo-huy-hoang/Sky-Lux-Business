import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsDateString,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, PriorityLevel } from '../../../common/enums';
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

  @ApiPropertyOptional({
    description: 'Lọc theo mức độ ưu tiên',
    enum: PriorityLevel,
  })
  @IsEnum(PriorityLevel)
  @IsOptional()
  priority?: PriorityLevel;

  @ApiPropertyOptional({ description: 'Hạn chót từ ngày (ISO string)' })
  @IsDateString()
  @IsOptional()
  dueFrom?: string;

  @ApiPropertyOptional({ description: 'Hạn chót đến ngày (ISO string)' })
  @IsDateString()
  @IsOptional()
  dueTo?: string;

  @ApiPropertyOptional({ description: 'Lọc các công việc đã quá hạn' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  overdue?: boolean;
}
