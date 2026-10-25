import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UploadImportDto {
  @IsNotEmpty()
  @IsString()
  templateType: string; // e.g. 'ESTIMATE', 'DOSSIER'

  @IsOptional()
  @IsUUID()
  templateId?: string;
}
