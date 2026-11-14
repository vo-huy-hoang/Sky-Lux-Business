import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class WorkflowActionDto {
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  operatorUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  businessLineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  marketTypeId?: string;

  @ApiPropertyOptional({
    description: 'Phiên bản hồ sơ hiện tại dùng cho optimistic locking',
    example: 1,
  })
  @IsOptional()
  @IsInt({ message: 'version phải là số nguyên dương' })
  @Min(1, { message: 'version phải lớn hơn hoặc bằng 1' })
  version?: number;
}
