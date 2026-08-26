import { IsOptional, IsString, MaxLength } from 'class-validator';
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
}
