import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateEstimateDto } from './create-estimate.dto';
import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
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

  @ApiPropertyOptional({
    description: 'Phiên bản dữ liệu hiện tại dùng cho optimistic locking',
    example: 1,
  })
  @IsInt({ message: 'version phải là số nguyên dương' })
  @Min(1, { message: 'version phải lớn hơn hoặc bằng 1' })
  @IsOptional()
  version?: number;
}
