import {
  IsArray,
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { RoleScope } from '../../../common/enums';

export class PermissionAssignmentItemDto {
  @ApiProperty({
    description: 'ID của Quyền hạn (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'ID của quyền hạn phải đúng định dạng UUID' })
  @IsNotEmpty({ message: 'ID của quyền hạn không được để trống' })
  permissionId: string;

  @ApiProperty({
    description: 'Phạm vi áp dụng của quyền',
    enum: RoleScope,
    example: RoleScope.ALL,
    required: false,
    default: RoleScope.ALL,
  })
  @IsEnum(RoleScope, { message: 'Phạm vi (scope) không hợp lệ' })
  @IsOptional()
  scope?: RoleScope;
}

export class AssignPermissionsDto {
  @ApiProperty({
    description: 'Danh sách các quyền hạn được gán',
    type: [PermissionAssignmentItemDto],
  })
  @IsArray({ message: 'Danh sách quyền hạn phải là một mảng' })
  @ValidateNested({ each: true })
  @Type(() => PermissionAssignmentItemDto)
  permissions: PermissionAssignmentItemDto[];
}
