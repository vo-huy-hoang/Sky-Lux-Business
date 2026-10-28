import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({
    description: 'Tên của tổ chức/doanh nghiệp',
    example: 'Công ty Du lịch Skylux',
  })
  @IsString({ message: 'Tên tổ chức phải là một chuỗi ký tự' })
  @MaxLength(255, { message: 'Tên tổ chức không được vượt quá 255 ký tự' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Đường dẫn URL hoặc relative path đến logo của tổ chức',
    example: 'https://files.skylux.vn/logos/skylux.png',
  })
  @IsString({ message: 'Đường dẫn logo phải là một chuỗi ký tự' })
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Múi giờ của tổ chức',
    example: 'Asia/Ho_Chi_Minh',
  })
  @IsString({ message: 'Múi giờ phải là một chuỗi ký tự' })
  @MaxLength(50, { message: 'Múi giờ không được vượt quá 50 ký tự' })
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Đơn vị tiền tệ chính sử dụng trong doanh nghiệp',
    example: 'VND',
  })
  @IsString({ message: 'Tiền tệ phải là một chuỗi ký tự' })
  @MaxLength(10, { message: 'Đơn vị tiền tệ không được vượt quá 10 ký tự' })
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: '0101234567' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  taxCode?: string;

  @ApiPropertyOptional({ example: 'lienhe@example.vn' })
  @IsEmail()
  @MaxLength(255)
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '0909 123 456' })
  @IsString()
  @MaxLength(30)
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Du lịch' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsString()
  @MaxLength(30)
  @IsOptional()
  status?: string;
}
