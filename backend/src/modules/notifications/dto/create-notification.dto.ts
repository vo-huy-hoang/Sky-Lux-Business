import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ description: 'ID người nhận thông báo' })
  @IsUUID('all', { message: 'userId phải là UUID hợp lệ' })
  @IsNotEmpty({ message: 'userId không được để trống' })
  userId: string;

  @ApiProperty({ description: 'Tiêu đề thông báo', example: 'Hồ sơ đã được phê duyệt' })
  @IsString({ message: 'Tiêu đề phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'Tiêu đề không được vượt quá 255 ký tự' })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string;

  @ApiProperty({ description: 'Nội dung chi tiết thông báo' })
  @IsString({ message: 'Nội dung phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  content: string;

  @ApiPropertyOptional({ description: 'Loại thông báo (DOSSIER, ESTIMATE, TASK, SYSTEM, CHAT)', default: 'SYSTEM' })
  @IsString()
  @IsOptional()
  type?: string = 'SYSTEM';

  @ApiPropertyOptional({ description: 'Đường dẫn liên kết khi click thông báo', example: '/main/dossiers/123' })
  @IsString()
  @IsOptional()
  linkUrl?: string;

  @ApiPropertyOptional({ description: 'Dữ liệu metadata mở rộng đính kèm' })
  @IsOptional()
  metadata?: Record<string, any>;
}
