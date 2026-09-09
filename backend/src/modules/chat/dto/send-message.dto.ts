import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Nội dung của tin nhắn' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  content: string;

  @ApiPropertyOptional({
    description:
      'Client Message ID (UUID) chống gửi trùng tin nhắn (Idempotency Key)',
  })
  @IsOptional()
  @IsString()
  clientMessageId?: string;
}
