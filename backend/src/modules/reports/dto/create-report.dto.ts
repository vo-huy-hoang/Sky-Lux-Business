import {
  IsObject,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateReportDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsString()
  @Length(1, 100)
  reportType: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}
