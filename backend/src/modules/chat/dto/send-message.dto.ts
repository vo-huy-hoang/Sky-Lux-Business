import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatAttachmentDto {
  @ApiProperty({ description: 'Đường dẫn tệp đính kèm' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: 'Tên gốc của tệp' })
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @ApiProperty({ description: 'Dung lượng tệp (bytes)' })
  @IsNumber()
  fileSize: number;

  @ApiProperty({ description: 'Loại MIME của tệp' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiPropertyOptional({ description: 'Ảnh thu nhỏ (nếu là hình ảnh)' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

export class SendMessageDto {
  @ApiPropertyOptional({ description: 'Nội dung của tin nhắn' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Danh sách tệp đính kèm trong tin nhắn',
    type: [ChatAttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments?: ChatAttachmentDto[];

  @ApiPropertyOptional({
    description:
      'Client Message ID (UUID) chống gửi trùng tin nhắn (Idempotency Key)',
  })
  @IsOptional()
  @IsString()
  clientMessageId?: string;
}
