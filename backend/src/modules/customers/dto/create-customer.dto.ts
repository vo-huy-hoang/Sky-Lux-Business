import {
  IsOptional,
  IsString,
  IsEnum,
  IsEmail,
  IsArray,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerType } from '../../../common/enums';
import { CreateCustomerContactDto } from './create-customer-contact.dto';

export class CreateCustomerDto {
  @ApiProperty({
    description: 'Mã số khách hàng (độc nhất trong tổ chức)',
    example: 'KH001',
  })
  @IsString({ message: 'Mã khách hàng phải là một chuỗi ký tự' })
  @MaxLength(50, { message: 'Mã khách hàng không được vượt quá 50 ký tự' })
  code: string;

  @ApiProperty({
    description: 'Loại khách hàng (Cá nhân, Công ty, Tổ chức)',
    enum: CustomerType,
    example: CustomerType.INDIVIDUAL,
  })
  @IsEnum(CustomerType, { message: 'Loại khách hàng không hợp lệ' })
  customerType: CustomerType;

  @ApiProperty({
    description: 'Tên hiển thị của khách hàng',
    example: 'Nguyễn Văn A',
  })
  @IsString({ message: 'Tên hiển thị phải là một chuỗi ký tự' })
  @MaxLength(255, { message: 'Tên hiển thị không được vượt quá 255 ký tự' })
  displayName: string;

  @ApiPropertyOptional({
    description: 'Mã số thuế của doanh nghiệp khách hàng',
    example: '0102030405',
  })
  @IsString({ message: 'Mã số thuế phải là một chuỗi ký tự' })
  @MaxLength(50, { message: 'Mã số thuế không được vượt quá 50 ký tự' })
  @IsOptional()
  taxCode?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại liên hệ chính',
    example: '0912345678',
  })
  @IsString({ message: 'Số điện thoại phải là một chuỗi ký tự' })
  @MaxLength(20, { message: 'Số điện thoại không được vượt quá 20 ký tự' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Địa chỉ email chính',
    example: 'customer.a@gmail.com',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @MaxLength(255, { message: 'Email không được vượt quá 255 ký tự' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Địa chỉ của khách hàng',
    example: '123 Đường Láng, Hà Nội',
  })
  @IsString({ message: 'Địa chỉ phải là một chuỗi ký tự' })
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Ngày sinh nhật của khách hàng (định dạng YYYY-MM-DD)',
    example: '1990-05-15',
  })
  @IsString({ message: 'Ngày sinh phải là một chuỗi ngày hợp lệ' })
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'ID của nhân viên kinh doanh quản lý khách hàng này',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsString()
  @IsOptional()
  assignedSalesId?: string;

  @ApiPropertyOptional({
    description: 'Danh sách các liên hệ đi kèm của khách hàng',
    type: [CreateCustomerContactDto],
  })
  @IsArray({ message: 'Danh sách liên hệ phải là một mảng' })
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerContactDto)
  @IsOptional()
  contacts?: CreateCustomerContactDto[];
}
