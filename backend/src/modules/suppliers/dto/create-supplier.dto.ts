import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsEmail,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({
    description: 'Mã nhà cung cấp (độc nhất trong tổ chức)',
    example: 'NCC-ABC',
  })
  @IsNotEmpty({ message: 'Mã nhà cung cấp không được để trống' })
  @IsString({ message: 'Mã nhà cung cấp phải là một chuỗi ký tự' })
  @MaxLength(50, { message: 'Mã nhà cung cấp không được vượt quá 50 ký tự' })
  code: string;

  @ApiProperty({
    description: 'Tên nhà cung cấp',
    example: 'Công ty Du lịch Hàng không ABC',
  })
  @IsNotEmpty({ message: 'Tên nhà cung cấp không được để trống' })
  @IsString({ message: 'Tên nhà cung cấp phải là một chuỗi ký tự' })
  @MaxLength(255, { message: 'Tên nhà cung cấp không được vượt quá 255 ký tự' })
  name: string;

  @ApiPropertyOptional({
    description: 'Mã số thuế',
    example: '0101234567',
  })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  taxCode?: string;

  @ApiPropertyOptional({
    description: 'Tên người liên hệ đại diện',
    example: 'Nguyễn Văn A',
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  contactName?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại liên hệ',
    example: '0987654321',
  })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Email liên hệ',
    example: 'contact@abc-travel.com',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Địa chỉ nhà cung cấp',
    example: '123 Đường Trần Hưng Đạo, Quận 1, TP. Hồ Chí Minh',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Điều khoản thanh toán',
    example: 'Thanh toán chuyển khoản sau 15 ngày nhận hóa đơn',
  })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiPropertyOptional({
    description: 'ID loại nhà cung cấp',
    example: 'f1a2b3c4-d5e6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsUUID('all', { message: 'ID loại nhà cung cấp phải là UUID hợp lệ' })
  @IsOptional()
  supplierTypeId?: string;

  @ApiPropertyOptional({
    description:
      'Tên loại nhà cung cấp nhập trực tiếp; hệ thống sẽ dùng loại đã có hoặc tạo loại mới',
    example: 'Vé tham quan',
  })
  @IsString({ message: 'Tên loại nhà cung cấp phải là một chuỗi ký tự' })
  @MaxLength(255, {
    message: 'Tên loại nhà cung cấp không được vượt quá 255 ký tự',
  })
  @IsOptional()
  supplierTypeName?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái nhà cung cấp',
    enum: ['ACTIVE', 'INACTIVE', 'LOCKED'],
    default: 'ACTIVE',
  })
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE', 'LOCKED'])
  @IsOptional()
  status?: string;
}
