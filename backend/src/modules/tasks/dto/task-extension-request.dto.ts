import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TaskExtensionRequestDto {
  @ApiProperty({ description: 'Hạn chót mới được yêu cầu (ISO string)' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ description: 'Lý do xin gia hạn', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
