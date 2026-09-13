import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, Length } from 'class-validator';

export class ReportExportDto {
  @ApiProperty({ description: 'Loại báo cáo cần xuất', example: 'revenue' })
  @IsString()
  @Length(1, 100)
  reportType: string;

  @ApiProperty({ enum: ['XLSX', 'CSV', 'PDF'] })
  @IsIn(['XLSX', 'CSV', 'PDF'])
  format: 'XLSX' | 'CSV' | 'PDF';

  @ApiPropertyOptional({
    description: 'Bộ lọc giống ReportQueryDto',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}
