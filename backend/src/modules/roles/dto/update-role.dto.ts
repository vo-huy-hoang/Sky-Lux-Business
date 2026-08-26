import {
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiPropertyOptional({
    example: 'Trưởng nhóm Kinh doanh Cao cấp',
    description: 'Tên hiển thị mới của vai trò',
  })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Tên vai trò tối thiểu 2 ký tự' })
  @MaxLength(255, { message: 'Tên vai trò tối đa 255 ký tự' })
  name?: string;

  @ApiPropertyOptional({
    example: 'Cập nhật mô tả phân quyền cho trưởng nhóm',
    description: 'Mô tả chi tiết vai trò',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: ['dossier.view', 'dossier.create', 'estimate.approve'],
    description: 'Danh sách mã quyền cập nhật cho vai trò này',
    type: [String],
  })
  @IsArray({ message: 'Danh sách quyền phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi mã quyền phải là chuỗi' })
  @IsOptional()
  permissionCodes?: string[];
}
