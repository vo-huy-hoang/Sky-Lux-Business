import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsInt,
  IsBoolean,
  IsDateString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriorityLevel } from '../../../common/enums';

export class CreateTaskChecklistItemDto {
  @ApiPropertyOptional({ description: 'ID checklist item (nếu cập nhật)' })
  @IsUUID('all', { message: 'ID checklist phải là UUID hợp lệ' })
  @IsOptional()
  id?: string;

  @ApiProperty({
    description: 'Nội dung công việc phụ',
    example: 'Đặt xe tiễn sân bay',
  })
  @IsString({ message: 'Nội dung checklist phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'Nội dung không được vượt quá 255 ký tự' })
  title: string;

  @ApiPropertyOptional({ default: false, description: 'Trạng thái hoàn thành' })
  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean = false;

  @ApiPropertyOptional({ default: 0, description: 'Thứ tự sắp xếp' })
  @IsInt()
  @IsOptional()
  sortOrder?: number = 0;
}

export class CreateTaskDto {
  @ApiPropertyOptional({ description: 'ID hồ sơ vụ việc liên quan' })
  @IsUUID('all', { message: 'ID hồ sơ vụ việc phải là UUID hợp lệ' })
  @IsOptional()
  dossierId?: string;

  @ApiProperty({
    description: 'Tiêu đề công việc',
    example: 'Chuẩn bị hồ sơ visa Đoàn',
  })
  @IsString({ message: 'Tiêu đề công việc phải là một chuỗi ký tự' })
  @MaxLength(255, { message: 'Tiêu đề không được vượt quá 255 ký tự' })
  title: string;

  @ApiPropertyOptional({ description: 'Mô tả chi tiết công việc' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'ID người được giao việc' })
  @IsUUID('all', { message: 'ID người được giao việc phải là UUID hợp lệ' })
  @IsOptional()
  assignedTo?: string;

  @ApiPropertyOptional({
    description: 'Mức độ ưu tiên',
    enum: PriorityLevel,
    default: PriorityLevel.MEDIUM,
  })
  @IsEnum(PriorityLevel, { message: 'Mức độ ưu tiên không hợp lệ' })
  @IsOptional()
  priority?: PriorityLevel;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu (ISO Date string)' })
  @IsDateString({}, { message: 'Ngày bắt đầu phải đúng định dạng ngày tháng' })
  @IsOptional()
  startAt?: string;

  @ApiPropertyOptional({ description: 'Hạn chót (ISO Date string)' })
  @IsDateString({}, { message: 'Hạn chót phải đúng định dạng ngày tháng' })
  @IsOptional()
  dueAt?: string;

  @ApiPropertyOptional({
    type: [CreateTaskChecklistItemDto],
    description: 'Danh sách các checklist items đi kèm',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateTaskChecklistItemDto)
  @IsOptional()
  checklistItems?: CreateTaskChecklistItemDto[];
}
