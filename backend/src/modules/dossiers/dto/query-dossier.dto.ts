import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DossierStatus, PriorityLevel } from '../../../common/enums';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryDossierDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái hồ sơ',
    enum: DossierStatus,
  })
  @IsEnum(DossierStatus, { message: 'Trạng thái không hợp lệ' })
  @IsOptional()
  status?: DossierStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo mức độ ưu tiên',
    enum: PriorityLevel,
  })
  @IsEnum(PriorityLevel, { message: 'Mức độ ưu tiên không hợp lệ' })
  @IsOptional()
  priority?: PriorityLevel;

  @ApiPropertyOptional({
    description: 'Lọc theo nhân viên Sales phụ trách',
  })
  @IsOptional()
  salesUserId?: string;
}
