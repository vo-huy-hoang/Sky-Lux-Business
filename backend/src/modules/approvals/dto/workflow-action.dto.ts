import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

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
}
