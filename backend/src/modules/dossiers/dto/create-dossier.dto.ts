import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriorityLevel } from '../../../common/enums';

export class CreateDossierDto {
  @ApiProperty({
    description: 'Mã hồ sơ (độc nhất toàn hệ thống)',
    example: 'HS-2026-0001',
  })
  @IsString({ message: 'Mã hồ sơ phải là một chuỗi ký tự' })
  @MaxLength(50, { message: 'Mã hồ sơ không được vượt quá 50 ký tự' })
  code: string;

  @ApiProperty({
    description: 'Tên hồ sơ vụ việc',
    example: 'Đoàn khách VIP tham quan Hạ Long',
  })
  @IsString({ message: 'Tên hồ sơ phải là một chuỗi ký tự' })
  @MaxLength(255, { message: 'Tên hồ sơ không được vượt quá 255 ký tự' })
  name: string;

  @ApiProperty({
    description: 'ID của khách hàng liên quan',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  @IsUUID('all', { message: 'ID khách hàng phải là định dạng UUID hợp lệ' })
  customerId: string;

  @ApiPropertyOptional({
    description: 'Tên khách hàng tại thời điểm tạo hồ sơ',
    example: 'Nguyễn Văn A',
  })
  @IsString({ message: 'Tên khách hàng phải là một chuỗi ký tự' })
  @MaxLength(255, { message: 'Tên khách hàng không được vượt quá 255 ký tự' })
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({
    description: 'ID dòng nghiệp vụ',
    example: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e',
  })
  @IsUUID('all', { message: 'ID dòng nghiệp vụ phải là định dạng UUID hợp lệ' })
  @IsOptional()
  businessLineId?: string;

  @ApiPropertyOptional({
    description: 'ID loại thị trường',
    example: 'c1d2e3f4-a5b6-7c8d-9e0f-1a2b3c4d5e6f',
  })
  @IsUUID('all', {
    message: 'ID loại thị trường phải là định dạng UUID hợp lệ',
  })
  @IsOptional()
  marketTypeId?: string;

  @ApiPropertyOptional({
    description: 'Tên mảng kinh doanh lấy từ nguồn dữ liệu, ví dụ VÉ LẺ',
    example: 'VÉ LẺ',
  })
  @IsString({ message: 'Tên mảng kinh doanh phải là một chuỗi ký tự' })
  @MaxLength(255, {
    message: 'Tên mảng kinh doanh không được vượt quá 255 ký tự',
  })
  @IsOptional()
  businessLineName?: string;

  @ApiPropertyOptional({
    description: 'Tên loại hình lấy từ nguồn dữ liệu, ví dụ INBOUND',
    example: 'INBOUND',
  })
  @IsString({ message: 'Tên loại hình phải là một chuỗi ký tự' })
  @MaxLength(255, { message: 'Tên loại hình không được vượt quá 255 ký tự' })
  @IsOptional()
  marketTypeName?: string;

  @ApiPropertyOptional({
    description: 'ID nhân viên sales chịu trách nhiệm',
    example: 'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a',
  })
  @IsUUID('all', {
    message: 'ID nhân viên sales phải là định dạng UUID hợp lệ',
  })
  @IsOptional()
  salesUserId?: string;

  @ApiPropertyOptional({
    description: 'ID nhân viên điều hành',
    example: 'e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b',
  })
  @IsUUID('all', {
    message: 'ID nhân viên điều hành phải là định dạng UUID hợp lệ',
  })
  @IsOptional()
  operatorUserId?: string;

  @ApiPropertyOptional({
    description: 'Tuyến đường đi',
    example: 'Hà Nội - Hạ Long - Hà Nội',
  })
  @IsString({ message: 'Tuyến đường phải là một chuỗi ký tự' })
  @MaxLength(255, { message: 'Tuyến đường không được vượt quá 255 ký tự' })
  @IsOptional()
  route?: string;

  @ApiPropertyOptional({
    description: 'Ngày khởi hành (yyyy-mm-dd)',
    example: '2026-09-01',
  })
  @IsDateString(
    {},
    { message: 'Ngày khởi hành phải đúng định dạng ngày tháng' },
  )
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc (yyyy-mm-dd)',
    example: '2026-09-05',
  })
  @IsDateString({}, { message: 'Ngày kết thúc phải đúng định dạng ngày tháng' })
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Thời lượng tour theo nguồn dữ liệu, ví dụ 3 ngày 2 đêm',
    example: '3 ngày 2 đêm',
  })
  @IsString({ message: 'Thời lượng tour phải là một chuỗi ký tự' })
  @MaxLength(100, { message: 'Thời lượng tour không được vượt quá 100 ký tự' })
  @IsOptional()
  tourDuration?: string;

  @ApiPropertyOptional({
    description: 'Ngày ghi nhận doanh thu (yyyy-mm-dd)',
    example: '2026-09-05',
  })
  @IsDateString(
    {},
    { message: 'Ngày ghi nhận doanh thu phải đúng định dạng ngày tháng' },
  )
  @IsOptional()
  revenueRecognitionDate?: string;

  @ApiPropertyOptional({
    description: 'Mức độ ưu tiên',
    enum: PriorityLevel,
    example: PriorityLevel.MEDIUM,
  })
  @IsEnum(PriorityLevel, { message: 'Mức độ ưu tiên không hợp lệ' })
  @IsOptional()
  priority?: PriorityLevel;
}
