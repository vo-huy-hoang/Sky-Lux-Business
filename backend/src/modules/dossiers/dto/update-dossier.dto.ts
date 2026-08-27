import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateDossierDto } from './create-dossier.dto';
import { IsOptional, IsEnum } from 'class-validator';
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
}
