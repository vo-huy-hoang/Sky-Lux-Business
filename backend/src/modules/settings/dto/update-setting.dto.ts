import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingDto {
  @ApiProperty({ description: 'Giá trị cấu hình (chuỗi hoặc JSON object)', example: '10' })
  @IsNotEmpty()
  value: any;
}
