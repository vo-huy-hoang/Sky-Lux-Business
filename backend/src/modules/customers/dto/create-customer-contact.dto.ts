import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerContactDto {
  @ApiProperty({
    description: 'Họ và tên của người liên hệ',
    example: 'Nguyễn Văn A',
  })
  @IsString({ message: 'Tên người liên hệ phải là một chuỗi ký tự' })
  @MaxLength(255, {
    message: 'Tên người liên hệ không được vượt quá 255 ký tự',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Chức vụ của người liên hệ',
    example: 'Trưởng phòng kinh doanh',
  })
  @IsString({ message: 'Chức vụ phải là một chuỗi ký tự' })
  @MaxLength(100, { message: 'Chức vụ không được vượt quá 100 ký tự' })
  @IsOptional()
  position?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại của người liên hệ',
    example: '0912345678',
  })
  @IsString({ message: 'Số điện thoại phải là một chuỗi ký tự' })
  @MaxLength(20, { message: 'Số điện thoại không được vượt quá 20 ký tự' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Địa chỉ email của người liên hệ',
    example: 'contact.a@company.com',
  })
  @IsEmail({}, { message: 'Email người liên hệ không đúng định dạng' })
  @MaxLength(255, { message: 'Email không được vượt quá 255 ký tự' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Có phải là liên hệ chính hay không',
    example: true,
    default: false,
  })
  @IsBoolean({ message: 'Trạng thái liên hệ chính phải là boolean' })
  @IsOptional()
  isPrimary?: boolean;
}

export class UpdateCustomerContactDto extends CreateCustomerContactDto {
  @ApiPropertyOptional({
    description:
      'ID của liên hệ khách hàng (chỉ truyền khi cập nhật liên hệ hiện tại)',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsString()
  @IsOptional()
  id?: string;
}
