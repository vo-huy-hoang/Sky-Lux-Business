import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';
import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { TaskStatus } from '../../../common/enums';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({
    description: 'Trạng thái công việc',
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
  })
  @IsEnum(TaskStatus, { message: 'Trạng thái công việc không hợp lệ' })
  @IsOptional()
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Tiến độ hoàn thành (%)',
    minimum: 0,
    maximum: 100,
    example: 50,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progressPercent?: number;

  @ApiPropertyOptional({ description: 'Thời điểm hoàn thành thực tế' })
  @IsDateString()
  @IsOptional()
  completedAt?: string;
}
