import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateChecklistItemDto {
  @ApiProperty({
    description: 'Nội dung việc phụ',
    example: 'Kiểm tra hồ sơ gốc',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên việc phụ không được để trống' })
  @MaxLength(255)
  title: string;

  @ApiProperty({ description: 'Thứ tự sắp xếp', required: false, default: 0 })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
