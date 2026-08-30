import { IsOptional, IsString, IsUUID, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QuerySupplierDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái nhà cung cấp (ACTIVE, INACTIVE, LOCKED)',
    enum: ['ACTIVE', 'INACTIVE', 'LOCKED'],
  })
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE', 'LOCKED'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'ID phân loại nhà cung cấp (UUID)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('all', { message: 'supplierTypeId phải là UUID hợp lệ' })
  @IsOptional()
  supplierTypeId?: string;
}
