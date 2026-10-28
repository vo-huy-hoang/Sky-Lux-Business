import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Công ty Du lịch Skylux' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'SKYLUX-HN' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code: string;

  @ApiProperty({ example: 'skylux-ha-noi' })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;

  @ApiPropertyOptional({
    example: 'Asia/Ho_Chi_Minh',
    default: 'Asia/Ho_Chi_Minh',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ example: 'VND', default: 'VND' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ example: '0101234567' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  taxCode?: string;

  @ApiPropertyOptional({ example: 'lienhe@example.vn' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  contactEmail?: string;

  @ApiPropertyOptional({ example: '0909 123 456' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Du lịch' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  industry?: string;
}
