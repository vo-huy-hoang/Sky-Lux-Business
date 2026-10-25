import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class CreateCeoUserDto extends OmitType(CreateUserDto, [
  'roleIds',
  'departmentId',
] as const) {
  @ApiProperty({ description: 'Organization mà CEO_ADMIN sẽ quản lý' })
  @IsUUID('4')
  organizationId: string;
}
