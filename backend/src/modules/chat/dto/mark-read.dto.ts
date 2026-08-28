import { IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkReadDto {
  @ApiProperty({
    description: 'ID của tin nhắn cuối cùng được đọc (nếu có)',
    required: false,
  })
  @IsUUID('4')
  @IsOptional()
  messageId?: string;
}
