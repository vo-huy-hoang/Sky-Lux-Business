import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DownloadUrlQueryDto {
  @ApiPropertyOptional({ description: 'Số phiên bản cụ thể cần tải về' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  versionNo?: number;

  @ApiPropertyOptional({
    default: 3600,
    description: 'Thời gian hết hạn của Signed URL (giây, tối đa 86400)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86400)
  @IsOptional()
  expiresIn: number = 3600;
}
