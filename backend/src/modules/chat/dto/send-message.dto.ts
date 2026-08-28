import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Nội dung của tin nhắn' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  content: string;
}
