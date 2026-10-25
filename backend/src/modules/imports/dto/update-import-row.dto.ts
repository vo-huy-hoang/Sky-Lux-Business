import { IsNotEmpty, IsObject } from 'class-validator';

export class UpdateImportRowDto {
  @IsNotEmpty()
  @IsObject()
  rawData: Record<string, any>;
}
