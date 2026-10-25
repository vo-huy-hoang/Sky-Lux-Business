import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryDocumentDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo ID loại tài liệu' })
  @IsUUID()
  @IsOptional()
  documentTypeId?: string;
}
