import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description: 'Refresh token string (tùy chọn nếu đã gửi qua HttpOnly cookie)',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
