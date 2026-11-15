import { SupplierItem } from '@/types/supplier';

export interface SupplierOptionItem {
  label: string;
  value: string;
  id?: string;
  code?: string;
  supplierTypeId?: string | null;
  supplierTypeName?: string;
  key?: string;
}

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

  return list.map((supplier) => {
    const displayLabel = supplier.code
      ? `[${supplier.code}] ${supplier.name}`
      : supplier.name;

    return {
      key: `supplier-${supplier.id}`,
      label: displayLabel,
      value: supplier.id,
      id: supplier.id,
      code: supplier.code,
      supplierTypeId: supplier.supplierTypeId,
      supplierTypeName:
        supplier.supplierTypeName || supplier.supplierType?.name,
    };
  });
}

export interface CurrentRowSupplierInfo {
  supplierId?: string;
  supplierName?: string;
  supplierCode?: string;
  supplierTypeName?: string;
}

/**
 * Hợp nhất thông minh danh sách NCC tìm kiếm từ xa với NCC hiện tại của dòng chi phí (mergeByKey('id'))
 * Đảm bảo ô chọn không bao giờ bị mất nhãn (label) của NCC đã chọn trước đó kể cả khi nó không nằm trong kết quả tìm kiếm gần nhất.
 */
export function mergeSuppliersWithCurrent(
  options: SupplierOptionItem[],
  currentRow: CurrentRowSupplierInfo,
): SupplierOptionItem[] {
  if (!currentRow.supplierId && !currentRow.supplierName) {
    return options;
  }

  // 1. Trường hợp dòng đã có supplierId (UUID)
  if (currentRow.supplierId) {
    const exists = options.some(
      (opt) => opt.id === currentRow.supplierId || opt.value === currentRow.supplierId,
    );
    if (!exists) {
      const displayLabel = currentRow.supplierCode
        ? `[${currentRow.supplierCode}] ${currentRow.supplierName || currentRow.supplierId}`
        : currentRow.supplierName || currentRow.supplierId;

      return [
        {
          key: `current-supplier-${currentRow.supplierId}`,
          label: displayLabel,
          value: currentRow.supplierId,
          id: currentRow.supplierId,
          code: currentRow.supplierCode,
          supplierTypeName: currentRow.supplierTypeName,
        },
        ...options,
      ];
    }
    return options;
  }

  // 2. Trường hợp dòng chỉ có text supplierName (dữ liệu import chưa map UUID)
  if (currentRow.supplierName) {
    const exists = options.some(
      (opt) =>
        opt.label === currentRow.supplierName ||
        (currentRow.supplierCode && opt.label === `[${currentRow.supplierCode}] ${currentRow.supplierName}`),
    );
    if (!exists) {
      const displayLabel = currentRow.supplierCode
        ? `[${currentRow.supplierCode}] ${currentRow.supplierName}`
        : currentRow.supplierName;

      return [
        {
          key: `current-supplier-name-${currentRow.supplierName}`,
          label: displayLabel,
          value: currentRow.supplierName,
          code: currentRow.supplierCode,
          supplierTypeName: currentRow.supplierTypeName,
        },
        ...options,
      ];
    }
  }

  return options;
}
