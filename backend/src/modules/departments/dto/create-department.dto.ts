import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @Length(1, 50)
  code: string;

  @IsString()
  @Length(1, 255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}
