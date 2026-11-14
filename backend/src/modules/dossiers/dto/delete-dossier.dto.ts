import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DeleteDossierDto {
  @ApiPropertyOptional({
    description: 'Lý do xóa hồ sơ',
    example: 'Tạo thử nghiệm sai thông tin tour',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
