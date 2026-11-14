import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateSupplierDto } from './create-supplier.dto';

export class BatchCreateSuppliersDto {
  @ApiProperty({
    description: 'Danh sách các nhà cung cấp cần tạo (tối đa 500 bản ghi)',
    type: [CreateSupplierDto],
  })
  @IsArray({ message: 'Danh sách nhà cung cấp phải là một mảng' })
  @ArrayMinSize(1, {
    message: 'Cần ít nhất 1 nhà cung cấp để thực hiện nhập hàng loạt',
  })
  @ArrayMaxSize(500, {
    message: 'Chỉ hỗ trợ nhập tối đa 500 nhà cung cấp mỗi lần',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierDto)
  suppliers: CreateSupplierDto[];
}
