import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateSupplierDto } from './create-supplier.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  @ApiPropertyOptional({
    description: 'Trạng thái nhà cung cấp (ACTIVE, INACTIVE, LOCKED)',
    example: 'ACTIVE',
  })
  @IsString()
  @IsOptional()
  status?: string;
}
