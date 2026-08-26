import { IsArray, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPermissionsDto {
  @ApiProperty({
    example: [
      'dossier.view',
      'dossier.create',
      'estimate.view',
      'customer.manage',
    ],
    description: 'Danh sách mã quyền cần gán cho vai trò',
    type: [String],
  })
  @IsArray({ message: 'Danh sách quyền phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi mã quyền phải là chuỗi' })
  @IsNotEmpty({ message: 'Danh sách quyền không được để trống' })
  permissionCodes: string[];
}
