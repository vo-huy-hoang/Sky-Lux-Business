import { IsArray, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignUserRolesDto {
  @ApiProperty({
    example: [
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
    ],
    description: 'Danh sách ID của các vai trò cần gán cho người dùng',
    type: [String],
  })
  @IsArray({ message: 'Danh sách role IDs phải là một mảng' })
  @IsUUID('4', { each: true, message: 'Mỗi role ID phải là một UUID hợp lệ' })
  @IsNotEmpty({ message: 'Danh sách vai trò không được để trống' })
  roleIds: string[];
}
