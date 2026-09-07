import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsDateString,
} from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Số tiền thanh toán', example: 5000000 })
  @IsNumber()
  @Min(0, { message: 'Số tiền thanh toán phải lớn hơn hoặc bằng 0' })
  @IsNotEmpty({ message: 'Số tiền thanh toán không được để trống' })
  amount: number;

  @ApiPropertyOptional({
    description: 'Ngày thanh toán',
    example: '2026-09-01T10:00:00Z',
  })
  @IsDateString({}, { message: 'Ngày thanh toán không hợp lệ' })
  @IsOptional()
  paidAt?: string;

  @ApiPropertyOptional({
    description: 'Phương thức thanh toán',
    enum: PaymentMethod,
    example: PaymentMethod.BANK_TRANSFER,
  })
  @IsEnum(PaymentMethod, { message: 'Phương thức thanh toán không hợp lệ' })
  @IsOptional()
  method?: string;

  @ApiPropertyOptional({
    description: 'Mã giao dịch',
    example: 'FT260901123456',
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  referenceCode?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú',
    example: 'Khách hàng thanh toán đợt 1',
  })
  @IsString()
  @IsOptional()
  note?: string;
}
