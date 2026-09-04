import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentVersionDto {
  @ApiPropertyOptional({ description: 'ID của loại tài liệu' })
  @IsString()
  @IsOptional()
  documentTypeId?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú thay đổi của phiên bản mới (alias cho versionNote)',
  })
  @IsString()
  @IsOptional()
  changeNote?: string;

  @ApiPropertyOptional({ description: 'Ghi chú thay đổi của phiên bản mới' })
  @IsString()
  @IsOptional()
  versionNote?: string;

  @ApiPropertyOptional({ description: 'Mô tả tài liệu' })
  @IsString()
  @IsOptional()
  description?: string;
}
