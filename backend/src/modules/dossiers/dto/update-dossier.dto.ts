import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateDossierDto } from './create-dossier.dto';
import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { DossierStatus } from '../../../common/enums';

export class UpdateDossierDto extends PartialType(CreateDossierDto) {
  @ApiPropertyOptional({
    description: 'Trạng thái hồ sơ vụ việc',
    enum: DossierStatus,
    example: DossierStatus.SUBMITTED,
  })
  @IsEnum(DossierStatus, { message: 'Trạng thái hồ sơ không hợp lệ' })
  @IsOptional()
  status?: DossierStatus;

  @ApiPropertyOptional({
    description: 'Phiên bản dữ liệu hiện tại dùng cho optimistic locking',
    example: 1,
  })
  @IsInt({ message: 'version phải là số nguyên dương' })
  @Min(1, { message: 'version phải lớn hơn hoặc bằng 1' })
  @IsOptional()
  version?: number;
}
