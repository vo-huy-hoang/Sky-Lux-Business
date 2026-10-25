import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MasterDataItemResponseDto {
  @ApiProperty({ description: 'ID định danh (UUID)' })
  id: string;

  @ApiProperty({ description: 'Mã định danh duy nhất' })
  code: string;

  @ApiProperty({ description: 'Tên hiển thị' })
  name: string;

  @ApiPropertyOptional({ description: 'Mô tả chi tiết' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Ký hiệu viết tắt (dành cho đơn vị tính)',
  })
  symbol?: string;

  @ApiProperty({ description: 'Trạng thái hoạt động', default: 'ACTIVE' })
  status: string;

  @ApiPropertyOptional({ description: 'Thứ tự hiển thị' })
  sortOrder?: number;

  @ApiProperty({ description: 'Thời gian tạo' })
  createdAt: Date;

  @ApiProperty({ description: 'Thời gian cập nhật gần nhất' })
  updatedAt: Date;
}

export class MasterDataPaginationMetaDto {
  @ApiProperty({ description: 'Trang hiện tại', example: 1 })
  page: number;

  @ApiProperty({ description: 'Số bản ghi trên mỗi trang', example: 20 })
  pageSize: number;

  @ApiProperty({ description: 'Tổng số bản ghi', example: 10 })
  total: number;
}

export class PaginatedMasterDataResponseDto {
  @ApiProperty({
    type: [MasterDataItemResponseDto],
    description: 'Danh sách dữ liệu danh mục',
  })
  data: MasterDataItemResponseDto[];

  @ApiProperty({
    type: MasterDataPaginationMetaDto,
    description: 'Thông tin phân trang',
  })
  meta: MasterDataPaginationMetaDto;
}
