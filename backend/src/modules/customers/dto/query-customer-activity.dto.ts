import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { CustomerActivityType } from '../../../common/enums';

export class QueryCustomerActivityDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: CustomerActivityType,
    description: 'Lọc theo loại hoạt động',
  })
  @IsEnum(CustomerActivityType, { message: 'Loại hoạt động không hợp lệ' })
  @IsOptional()
  type?: CustomerActivityType;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Chỉ lấy hoạt động xảy ra từ thời điểm này (ISO 8601)',
  })
  @IsISO8601({}, { message: 'from phải là thời điểm ISO 8601 hợp lệ' })
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Chỉ lấy hoạt động xảy ra đến thời điểm này (ISO 8601)',
  })
  @IsISO8601({}, { message: 'to phải là thời điểm ISO 8601 hợp lệ' })
  @IsOptional()
  to?: string;
}
