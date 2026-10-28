import { OmitType } from '@nestjs/swagger';
import { UpdateUserDto } from './update-user.dto';

export class UpdateCeoUserDto extends OmitType(UpdateUserDto, [
  'roleIds',
  'departmentId',
] as const) {}
