import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiPropertyOptional({ description: 'ID phân loại tài liệu' })
  @IsUUID()
  @IsOptional()
  documentTypeId?: string;

  @ApiPropertyOptional({ description: 'ID dự toán liên quan' })
  @IsUUID()
  @IsOptional()
  estimateId?: string;

  @ApiPropertyOptional({ description: 'Ghi chú mô tả tài liệu hoặc phiên bản' })
  @IsString()
  @IsOptional()
  changeNote?: string;
}
