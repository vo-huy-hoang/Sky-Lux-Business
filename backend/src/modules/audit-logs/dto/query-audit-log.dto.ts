import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryAuditLogDto {
  @ApiPropertyOptional({ description: 'UUID của người thực hiện thao tác' })
  @IsOptional()
  @IsUUID('4', { message: 'actorUserId phải là UUID hợp lệ' })
  actorUserId?: string;

  @ApiPropertyOptional({
    description:
      'Hành động thực hiện (CREATE, UPDATE, DELETE, LOCK, APPROVE, ...)',
    example: 'UPDATE',
  })
  @IsOptional()
  @IsString({ message: 'action phải là chuỗi ký tự' })
  action?: string;

  @ApiPropertyOptional({
    description: 'Loại đối tượng (dossier, customer, estimate, ...)',
    example: 'dossier',
  })
  @IsOptional()
  @IsString({ message: 'entityType phải là chuỗi ký tự' })
  entityType?: string;

  @ApiPropertyOptional({ description: 'ID của đối tượng tác động' })
  @IsOptional()
  @IsString({ message: 'entityId phải là chuỗi ký tự' })
  entityId?: string;

  @ApiPropertyOptional({ description: 'Request ID của giao dịch' })
  @IsOptional()
  @IsString({ message: 'requestId phải là chuỗi ký tự' })
  requestId?: string;

  @ApiPropertyOptional({
    description: 'Từ ngày (ISO format: YYYY-MM-DDTHH:mm:ss.sssZ)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'from phải là định dạng ngày ISO hợp lệ' })
  from?: string;

  @ApiPropertyOptional({
    description: 'Đến ngày (ISO format: YYYY-MM-DDTHH:mm:ss.sssZ)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'to phải là định dạng ngày ISO hợp lệ' })
  to?: string;

  @ApiPropertyOptional({
    description:
      'Tìm kiếm tự do trong action, entityType, requestId, ipAddress',
  })
  @IsOptional()
  @IsString({ message: 'search phải là chuỗi ký tự' })
  search?: string;

  @ApiPropertyOptional({ description: 'Số trang', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên' })
  @Min(1, { message: 'page phải lớn hơn hoặc bằng 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số bản ghi trên mỗi trang (tối đa 100)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize phải là số nguyên' })
  @Min(1, { message: 'pageSize phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'pageSize tối đa là 100' })
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Alias của pageSize' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'limit tối đa là 100' })
  limit?: number;
}
