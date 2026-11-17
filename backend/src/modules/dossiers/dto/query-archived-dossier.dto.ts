import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DossierStatus } from '../../../common/enums';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryArchivedDossierDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái hồ sơ trước khi xóa',
    enum: DossierStatus,
  })
  @IsEnum(DossierStatus, { message: 'Trạng thái không hợp lệ' })
  @IsOptional()
  status?: DossierStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo nhân viên Sales phụ trách',
  })
  @IsUUID('4', { message: 'ID Sales phải là UUID' })
  @IsOptional()
  salesUserId?: string;
}
