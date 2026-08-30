import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentVersionDto {
  @ApiPropertyOptional({ description: 'Ghi chú thay đổi của phiên bản mới' })
  @IsString()
  @IsOptional()
  changeNote?: string;
}
