import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateEstimateDto } from './create-estimate.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { EstimateStatus } from '../../../common/enums';

export class UpdateEstimateDto extends PartialType(CreateEstimateDto) {
  @ApiPropertyOptional({
    description: 'Trạng thái của bản báo giá',
    enum: EstimateStatus,
    example: EstimateStatus.SUBMITTED,
  })
  @IsEnum(EstimateStatus, { message: 'Trạng thái báo giá không hợp lệ' })
  @IsOptional()
  status?: EstimateStatus;
}
