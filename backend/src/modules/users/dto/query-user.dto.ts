import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../../common/enums';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryUserDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID vai trò (UUID)',
  })
  @IsUUID('4')
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID phòng ban (UUID)',
  })
  @IsUUID('4')
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({
    enum: UserStatus,
    description: 'Lọc theo trạng thái người dùng (ACTIVE, INACTIVE, LOCKED)',
  })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}
