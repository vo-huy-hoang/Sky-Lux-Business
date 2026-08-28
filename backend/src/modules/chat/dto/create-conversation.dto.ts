import {
  IsString,
  IsBoolean,
  IsArray,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Tên nhóm trò chuyện (nếu là nhóm)',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Có phải là nhóm trò chuyện hay không',
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isGroup?: boolean;

  @ApiProperty({
    description: 'Danh sách ID người dùng tham gia cuộc hội thoại',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];

  @ApiProperty({ description: 'ID Hồ sơ tour liên kết', required: false })
  @IsUUID('4')
  @IsOptional()
  dossierId?: string;
}
