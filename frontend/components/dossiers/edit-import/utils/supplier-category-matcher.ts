/**
 * Chuẩn hóa chuỗi tiếng Việt: bỏ dấu, chuyển chữ thường, loại bỏ ký tự thừa.
 */
export function stripVietnameseDiacritics(str: string = ''): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

export type CanonicalSupplierCategory =
  | 'XE'
  | 'NHA_HANG'
  | 'VE_MAY_BAY'
  | 'VE_THAM_QUAN'
  | 'KHACH_SAN'
  | 'HDV'
  | 'BAO_HIEM'
  | 'OTHER';

/**
 * Ánh xạ một tên loại hoặc tiêu đề mục chi phí về mã phân nhóm chuẩn hóa.
 */
export function normalizeCategoryKey(name?: string): CanonicalSupplierCategory {
  if (!name) return 'OTHER';
  const clean = stripVietnameseDiacritics(name);

  // Kiểm tra Vé máy bay / Hàng không trước (tránh nhầm với từ 'vé' chung chung)
  if (
    clean.includes('may bay') ||
    clean.includes('hang khong') ||
    clean.includes('flight') ||
    clean.includes('airline')
  ) {
    return 'VE_MAY_BAY';
  }

  // Kiểm tra Vé tham quan / Điểm đến
  if (
    clean.includes('tham quan') ||
    clean.includes('diem den') ||
    clean.includes('ve vao cong') ||
    clean.includes('sightseeing')
  ) {
    return 'VE_THAM_QUAN';
  }

  // Kiểm tra Dịch vụ xe / Vận chuyển
  if (
    clean.includes('xe') ||
    clean.includes('van chuyen') ||
    clean.includes('transport') ||
    clean.includes('car')
  ) {
    return 'XE';
  }

  // Kiểm tra Nhà hàng / Ăn uống / Ẩm thực
  if (
    clean.includes('nha hang') ||
    clean.includes('an uong') ||
    clean.includes('am thuc') ||
    clean.includes('restaurant') ||
    clean.includes('dining') ||
    clean.includes('com nieu') ||
    clean.includes('buffet')
  ) {
    return 'NHA_HANG';
  }

  // Kiểm tra Khách sạn / Lưu trú / Resort
  if (
    clean.includes('khach san') ||
    clean.includes('luu tru') ||
    clean.includes('resort') ||
    clean.includes('hotel') ||
    clean.includes('homestay') ||
    clean.includes('nha nghi') ||
    clean.includes('phong nghi')
  ) {
    return 'KHACH_SAN';
  }

  // Kiểm tra Hướng dẫn viên
  if (
    clean.includes('huong dan vien') ||
    clean.includes('hdv') ||
    clean.includes('tour guide')
  ) {
    return 'HDV';
  }

  // Kiểm tra Bảo hiểm
  if (clean.includes('bao hiem') || clean.includes('insurance')) {
    return 'BAO_HIEM';
  }

  return 'OTHER';
}

/**
 * Kiểm tra xem Loại nhà cung cấp (supplierTypeName) có khớp với mục chi phí trong dự toán hay không.
 */
export function isSupplierMatchSection(
  supplierTypeName?: string,
  sectionTitleOrCategory?: string,
): boolean {
  if (!supplierTypeName || !sectionTitleOrCategory) return false;
  const supKey = normalizeCategoryKey(supplierTypeName);
  const secKey = normalizeCategoryKey(sectionTitleOrCategory);

  if (supKey === 'OTHER' || secKey === 'OTHER') return false;
  return supKey === secKey;
}

/**
 * Lấy nhãn đại diện thân thiện cho từng phân nhóm
 */
export function getCategoryDisplayName(key: CanonicalSupplierCategory): string {
  switch (key) {
    case 'XE':
      return 'Dịch vụ xe';
    case 'NHA_HANG':
      return 'Nhà hàng';
    case 'VE_MAY_BAY':
      return 'Vé máy bay';
    case 'VE_THAM_QUAN':
      return 'Vé tham quan';
    case 'KHACH_SAN':
      return 'Khách sạn';
    case 'HDV':
      return 'Hướng dẫn viên';
    case 'BAO_HIEM':
      return 'Bảo hiểm';
    default:
      return 'Dịch vụ khác';
  }
}

/**
 * Màu sắc nhận diện danh mục cho thẻ Tag (Ant Design)
 */
export function getCategoryBadgeColor(typeName?: string): string {
  const key = normalizeCategoryKey(typeName);
  switch (key) {
    case 'XE':
      return 'blue';
    case 'NHA_HANG':
      return 'cyan';
    case 'VE_MAY_BAY':
      return 'purple';
    case 'VE_THAM_QUAN':
      return 'orange';
    case 'KHACH_SAN':
      return 'geekblue';
    case 'HDV':
      return 'green';
    case 'BAO_HIEM':
      return 'magenta';
    default:
      return 'default';
  }
}
