import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRolesDto {
  @ApiProperty({
    description: 'Danh sách các ID của vai trò cần gán (UUID)',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray({ message: 'Danh sách vai trò phải là một mảng' })
  @IsUUID('4', {
    each: true,
    message: 'Mỗi ID vai trò phải đúng định dạng UUID',
  })
  @IsNotEmpty({ each: true, message: 'ID vai trò không được để trống' })
  roleIds: string[];
}
