import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../common/validators/password-policy.validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({
    description:
      'New password (min 8 characters, at least 1 uppercase, 1 lowercase, and 1 number)',
  })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @IsStrongPassword()
  newPassword: string;
}
