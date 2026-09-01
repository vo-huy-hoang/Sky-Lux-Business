import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsObject,
} from 'class-validator';

export class CreateAuditLogDto {
  @IsNotEmpty({ message: 'organizationId không được để trống' })
  @IsUUID('4', { message: 'organizationId phải là UUID hợp lệ' })
  organizationId: string;

  @IsOptional()
  @IsUUID('4', { message: 'actorUserId phải là UUID hợp lệ' })
  actorUserId?: string;

  @IsNotEmpty({ message: 'action không được để trống' })
  @IsString({ message: 'action phải là chuỗi ký tự' })
  action: string;

  @IsNotEmpty({ message: 'entityType không được để trống' })
  @IsString({ message: 'entityType phải là chuỗi ký tự' })
  entityType: string;

  @IsNotEmpty({ message: 'entityId không được để trống' })
  @IsString({ message: 'entityId phải là chuỗi ký tự' })
  entityId: string;

  @IsOptional()
  @IsObject({ message: 'beforeData phải là object' })
  beforeData?: Record<string, any>;

  @IsOptional()
  @IsObject({ message: 'afterData phải là object' })
  afterData?: Record<string, any>;

  @IsOptional()
  @IsString({ message: 'ipAddress phải là chuỗi ký tự' })
  ipAddress?: string;

  @IsOptional()
  @IsString({ message: 'userAgent phải là chuỗi ký tự' })
  userAgent?: string;

  @IsOptional()
  @IsString({ message: 'requestId phải là chuỗi ký tự' })
  requestId?: string;
}
