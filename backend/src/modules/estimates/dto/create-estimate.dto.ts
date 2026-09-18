import {
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
  IsInt,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEstimateRevenueLineDto {
  @ApiPropertyOptional({ description: 'ID dòng doanh thu (nếu cập nhật)' })
  @IsUUID('all', { message: 'ID dòng doanh thu phải là UUID hợp lệ' })
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ description: 'ID loại khách hàng/hành khách' })
  @IsUUID('all', { message: 'ID loại hành khách phải là UUID hợp lệ' })
  @IsOptional()
  passengerTypeId?: string;

  @ApiProperty({
    description: 'Mô tả dịch vụ/khoản thu',
    example: 'Vé máy bay khứ hồi',
  })
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'Mô tả không được vượt quá 255 ký tự' })
  description: string;

  @ApiPropertyOptional({ default: 1, description: 'Số lượng' })
  @IsNumber({}, { message: 'Số lượng phải là số' })
  @Min(0, { message: 'Số lượng không được âm' })
  @IsOptional()
  quantity?: number = 1;

  @ApiPropertyOptional({ description: 'ID đơn vị tính' })
  @IsUUID('all', { message: 'ID đơn vị tính phải là UUID hợp lệ' })
  @IsOptional()
  unitId?: string;

  @ApiPropertyOptional({ default: 1, description: 'Hệ số/Số ngày' })
  @IsNumber({}, { message: 'Hệ số phải là số' })
  @Min(0, { message: 'Hệ số không được âm' })
  @IsOptional()
  multiplier?: number = 1;

  @ApiPropertyOptional({ default: 0, description: 'Đơn giá chưa VAT' })
  @IsNumber({}, { message: 'Đơn giá phải là số' })
  @Min(0, { message: 'Đơn giá không được âm' })
  @IsOptional()
  unitPrice?: number = 0;

  @ApiPropertyOptional({ default: 0, description: 'Thuế suất VAT (%)' })
  @IsNumber({}, { message: 'Thuế suất VAT phải là số' })
  @Min(0, { message: 'Thuế suất VAT không được âm' })
  @IsOptional()
  vatRate?: number = 0;

  @ApiPropertyOptional({ description: 'Cơ sở tính giá' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  priceBasis?: string;

  @ApiPropertyOptional({ description: 'Ghi chú thêm' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ default: 0, description: 'Thứ tự sắp xếp' })
  @IsInt()
  @IsOptional()
  sortOrder?: number = 0;
}

export class CreateEstimateCostLineDto {
  @ApiPropertyOptional({ description: 'ID dòng chi phí (nếu cập nhật)' })
  @IsUUID('all', { message: 'ID dòng chi phí phải là UUID hợp lệ' })
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ description: 'ID danh mục dịch vụ' })
  @IsUUID('all', { message: 'ID danh mục dịch vụ phải là UUID hợp lệ' })
  @IsOptional()
  serviceCategoryId?: string;

  @ApiPropertyOptional({ description: 'ID nhà cung cấp' })
  @IsUUID('all', { message: 'ID nhà cung cấp phải là UUID hợp lệ' })
  @IsOptional()
  supplierId?: string;

  @ApiProperty({
    description: 'Mô tả dịch vụ/khoản chi',
    example: 'Khách sạn 5 sao',
  })
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'Mô tả không được vượt quá 255 ký tự' })
  description: string;

  @ApiPropertyOptional({ default: 1, description: 'Số lượng' })
  @IsNumber({}, { message: 'Số lượng phải là số' })
  @Min(0, { message: 'Số lượng không được âm' })
  @IsOptional()
  quantity?: number = 1;

  @ApiPropertyOptional({ description: 'ID đơn vị tính' })
  @IsUUID('all', { message: 'ID đơn vị tính phải là UUID hợp lệ' })
  @IsOptional()
  unitId?: string;

  @ApiPropertyOptional({ default: 1, description: 'Hệ số/Số ngày/Số đêm' })
  @IsNumber({}, { message: 'Hệ số phải là số' })
  @Min(0, { message: 'Hệ số không được âm' })
  @IsOptional()
  multiplier?: number = 1;

  @ApiPropertyOptional({ default: 0, description: 'Đơn giá chưa VAT' })
  @IsNumber({}, { message: 'Đơn giá phải là số' })
  @Min(0, { message: 'Đơn giá không được âm' })
  @IsOptional()
  unitPrice?: number = 0;

  @ApiPropertyOptional({ default: 0, description: 'Thuế suất VAT (%)' })
  @IsNumber({}, { message: 'Thuế suất VAT phải là số' })
  @Min(0, { message: 'Thuế suất VAT không được âm' })
  @IsOptional()
  vatRate?: number = 0;

  @ApiPropertyOptional({ description: 'Tổng tiền gốc từ file import, nếu có' })
  @IsNumber({}, { message: 'Số tiền nguồn phải là số' })
  @Min(0, { message: 'Số tiền nguồn không được âm' })
  @IsOptional()
  sourceAmount?: number | null;

  @ApiPropertyOptional({ description: 'Cơ sở tính giá' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  priceBasis?: string;

  @ApiPropertyOptional({ description: 'Ghi chú thêm' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ default: 0, description: 'Thứ tự sắp xếp' })
  @IsInt()
  @IsOptional()
  sortOrder?: number = 0;
}

export class CreateEstimateDto {
  @ApiProperty({ description: 'ID của hồ sơ vụ việc liên quan' })
  @IsUUID('all', { message: 'ID hồ sơ vụ việc phải là UUID hợp lệ' })
  dossierId: string;

  @ApiPropertyOptional({ default: 'VND', description: 'Đơn vị tiền tệ' })
  @IsString()
  @MaxLength(10)
  @IsOptional()
  currency?: string = 'VND';

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({
    type: [CreateEstimateRevenueLineDto],
    description: 'Danh sách các dòng doanh thu',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateEstimateRevenueLineDto)
  @IsOptional()
  revenueLines?: CreateEstimateRevenueLineDto[];

  @ApiPropertyOptional({
    type: [CreateEstimateCostLineDto],
    description: 'Danh sách các dòng chi phí',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateEstimateCostLineDto)
  @IsOptional()
  costLines?: CreateEstimateCostLineDto[];
}
