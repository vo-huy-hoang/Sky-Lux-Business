import { IsOptional, IsString, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TaskActionDto {
  @ApiPropertyOptional({ description: 'Ghi chú thêm khi thực hiện hành động' })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({ description: 'Mã lý do (nếu có)' })
  @IsString()
  @IsOptional()
  reasonCode?: string;

  @ApiPropertyOptional({ description: 'Metadata bổ sung' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
