import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerType } from '../../../common/enums';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryCustomerDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo loại khách hàng (Cá nhân, Công ty, Tổ chức)',
    enum: CustomerType,
  })
  @IsEnum(CustomerType, { message: 'Loại khách hàng không hợp lệ' })
  @IsOptional()
  customerType?: CustomerType;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái hoạt động (e.g. ACTIVE, INACTIVE)',
  })
  @IsString()
  @IsOptional()
  status?: string;
}
