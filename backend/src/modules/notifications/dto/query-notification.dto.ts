import { IsOptional, IsString, IsInt, Min, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryNotificationDto {
  @ApiPropertyOptional({ default: 1, description: 'Trang hiện tại' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'Số lượng phần tử mỗi trang' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái đã đọc (true/false)' })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @ApiPropertyOptional({ description: 'Lọc theo loại thông báo (DOSSIER, TASK, SYSTEM, v.v.)' })
  @IsString()
  @IsOptional()
  type?: string;
}
