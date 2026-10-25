import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

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
}
