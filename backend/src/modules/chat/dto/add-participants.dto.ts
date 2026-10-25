import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddParticipantsDto {
  @ApiProperty({
    description: 'Danh sách ID người dùng tham gia cuộc hội thoại',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];
}
