import { IsOptional, IsString, IsInt, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DossierStatus, PriorityLevel } from '../../../common/enums';

export class QueryDossierDto {
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
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo mã hồ sơ, tên hồ sơ hoặc tuyến đường',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái hồ sơ',
    enum: DossierStatus,
  })
  @IsEnum(DossierStatus, { message: 'Trạng thái không hợp lệ' })
  @IsOptional()
  status?: DossierStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo mức độ ưu tiên',
    enum: PriorityLevel,
  })
  @IsEnum(PriorityLevel, { message: 'Mức độ ưu tiên không hợp lệ' })
  @IsOptional()
  priority?: PriorityLevel;
}
