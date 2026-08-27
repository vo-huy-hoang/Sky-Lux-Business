import { PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateCustomerContactDto } from './create-customer-contact.dto';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @ApiPropertyOptional({
    description:
      'Danh sách các liên hệ đi kèm của khách hàng (Cần truyền ID để cập nhật liên hệ hiện tại)',
    type: [UpdateCustomerContactDto],
  })
  @IsArray({ message: 'Danh sách liên hệ phải là một mảng' })
  @ValidateNested({ each: true })
  @Type(() => UpdateCustomerContactDto)
  @IsOptional()
  contacts?: UpdateCustomerContactDto[];
}
