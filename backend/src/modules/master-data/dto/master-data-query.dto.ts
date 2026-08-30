import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class MasterDataQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái (e.g. ACTIVE, INACTIVE)',
  })
  @IsString()
  @IsOptional()
  status?: string;
}
