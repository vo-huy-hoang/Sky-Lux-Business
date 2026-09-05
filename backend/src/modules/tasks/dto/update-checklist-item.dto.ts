import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateChecklistItemDto } from './create-checklist-item.dto';

export class UpdateChecklistItemDto extends PartialType(CreateChecklistItemDto) {
  @ApiProperty({ description: 'Trạng thái hoàn thành', required: false })
  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}
