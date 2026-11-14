import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsUUID,
  IsArray,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../../common/enums';
import { IsStrongPassword } from '../../../common/validators/password-policy.validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'Nguyễn Văn A',
    description: 'Họ và tên người dùng',
  })
  @IsString()
  @IsNotEmpty({ message: 'Họ và tên không được để trống' })
  @MaxLength(255)
  fullName: string;

  @ApiProperty({
    example: 'user@skylux.vn',
    description: 'Địa chỉ email người dùng',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({
    example: 'EMP001',
    description: 'Mã nhân viên (tự sinh nếu để trống)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  employeeCode?: string;

  @ApiPropertyOptional({
    example: 'Password@123',
    description:
      'Mật khẩu khởi tạo (tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số; để trống để tự sinh mật khẩu tạm)',
  })
  @IsString()
  @IsOptional()
  @IsStrongPassword()
  password?: string;

  @ApiPropertyOptional({
    example: '0901234567',
    description: 'Số điện thoại',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'Đường dẫn ảnh đại diện',
  })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'ID phòng ban (UUID)',
  })
  @IsUUID('4', { message: 'ID phòng ban phải là UUID hợp lệ' })
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({
    example: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'],
    description: 'Danh sách ID vai trò được gán (UUID)',
  })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Mỗi ID vai trò phải là UUID hợp lệ' })
  @IsOptional()
  roleIds?: string[];

  @ApiPropertyOptional({
    enum: UserStatus,
    default: UserStatus.ACTIVE,
    description: 'Trạng thái tài khoản',
  })
  @IsEnum(UserStatus, { message: 'Trạng thái người dùng không hợp lệ' })
  @IsOptional()
  status?: UserStatus;
}
