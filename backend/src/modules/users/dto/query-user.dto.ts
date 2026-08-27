import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../../common/enums';

export class QueryUserDto {
  @ApiPropertyOptional({ default: 1, description: 'Số trang hiện tại' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({
    default: 20,
    description: 'Số lượng phần tử mỗi trang (tối đa 100)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize: number = 20;

  @ApiPropertyOptional({
    description:
      'Từ khóa tìm kiếm theo tên, mã nhân viên, email, số điện thoại',
  })
  @IsString()
  @IsOptional()
  search?: string;

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
