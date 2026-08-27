import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({
    example: 'Nguyễn Văn B',
    description: 'Họ và tên người liên hệ',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên người liên hệ không được để trống' })
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'Trưởng phòng Mua hàng',
    description: 'Chức danh / Vị trí công tác',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  position?: string;

  @ApiPropertyOptional({
    example: '0987654321',
    description: 'Số điện thoại liên hệ',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    example: 'contact@partner.com',
    description: 'Địa chỉ email người liên hệ',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Đánh dấu là người liên hệ chính của khách hàng',
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean = false;
}
