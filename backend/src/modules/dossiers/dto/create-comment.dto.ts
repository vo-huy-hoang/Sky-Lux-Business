import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Nội dung bình luận',
    example: 'Khách hàng yêu cầu đổi lịch bay sang ngày mai',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty({ message: 'Nội dung bình luận không được để trống' })
  @IsString({ message: 'Nội dung bình luận phải là chuỗi ký tự' })
  @MaxLength(5000, { message: 'Nội dung bình luận không vượt quá 5000 ký tự' })
  content: string;

  @ApiPropertyOptional({
    description: 'ID bình luận cha (nếu là câu trả lời)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Parent ID phải là UUID hợp lệ' })
  parentId?: string;
}
