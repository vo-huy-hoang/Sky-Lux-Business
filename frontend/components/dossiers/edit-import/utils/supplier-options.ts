import { SupplierItem } from '@/types/supplier';
import { SupplierOptionItem } from '../components/EstimateCostEditorTable';

/**
 * Ánh xạ danh sách nhà cung cấp từ API sang danh sách tùy chọn cho bảng dự toán.
 * Đảm bảo 100% sử dụng UUID thật từ cơ sở dữ liệu làm `value` và `id`,
 * tuyệt đối không sử dụng dữ liệu giả định.
 */
export function mapSuppliersToOptions(
  suppliers:
    | SupplierItem[]
    | { data?: SupplierItem[]; items?: SupplierItem[] }
    | null
    | undefined = [],
): SupplierOptionItem[] {
  let list: SupplierItem[] = [];
  if (Array.isArray(suppliers)) {
    list = suppliers;
  } else if (suppliers && typeof suppliers === 'object') {
    if (Array.isArray((suppliers as any).data)) {
      list = (suppliers as any).data;
    } else if (Array.isArray((suppliers as any).items)) {
      list = (suppliers as any).items;
    }
  }

  return list.map((supplier) => ({
    key: `supplier-${supplier.id}`,
    label: supplier.name,
    value: supplier.id,
    id: supplier.id,
    code: supplier.code,
    supplierTypeId: supplier.supplierTypeId,
    supplierTypeName:
      supplier.supplierTypeName || supplier.supplierType?.name,
  }));
}
