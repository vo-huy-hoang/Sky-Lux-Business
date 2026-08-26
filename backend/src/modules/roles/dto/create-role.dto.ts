import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    example: 'SALES_LEAD',
    description:
      'Mã định danh vai trò (viết hoa, không dấu, ngăn cách bằng gạch dưới)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mã vai trò không được để trống' })
  @MinLength(2, { message: 'Mã vai trò tối thiểu 2 ký tự' })
  @MaxLength(50, { message: 'Mã vai trò tối đa 50 ký tự' })
  @Matches(/^[A-Z0-9_]+$/, {
    message:
      'Mã vai trò chỉ được chứa chữ hoa, số và dấu gạch dưới (VD: SALES_LEAD)',
  })
  code: string;

  @ApiProperty({
    example: 'Trưởng nhóm Kinh doanh',
    description: 'Tên hiển thị của vai trò',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên vai trò không được để trống' })
  @MaxLength(255, { message: 'Tên vai trò tối đa 255 ký tự' })
  name: string;

  @ApiPropertyOptional({
    example: 'Phụ trách duyệt báo giá cấp nhóm và quản lý KPIs sales',
    description: 'Mô tả chi tiết vai trò',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: ['dossier.view', 'dossier.create', 'estimate.view'],
    description: 'Danh sách mã quyền gán cho vai trò này',
    type: [String],
  })
  @IsArray({ message: 'Danh sách quyền phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi mã quyền phải là chuỗi' })
  @IsOptional()
  permissionCodes?: string[];
}
