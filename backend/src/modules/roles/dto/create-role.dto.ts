import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Mã vai trò (chỉ chứa chữ hoa, số và dấu gạch dưới)',
    example: 'ACCOUNTANT',
  })
  @IsString({ message: 'Mã vai trò phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mã vai trò không được để trống' })
  @Length(3, 50, { message: 'Mã vai trò phải dài từ 3 đến 50 ký tự' })
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Mã vai trò chỉ được chứa chữ cái viết hoa, số và dấu gạch dưới',
  })
  code: string;

  @ApiProperty({
    description: 'Tên vai trò hiển thị',
    example: 'Kế toán doanh nghiệp',
  })
  @IsString({ message: 'Tên vai trò phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên vai trò không được để trống' })
  @Length(2, 255, { message: 'Tên vai trò phải dài từ 2 đến 255 ký tự' })
  name: string;

  @ApiProperty({
    description: 'Mô tả chi tiết chức năng vai trò',
    example: 'Quản lý thu chi và công nợ lữ hành',
    required: false,
  })
  @IsString({ message: 'Mô tả vai trò phải là chuỗi ký tự' })
  @IsOptional()
  description?: string;
}
