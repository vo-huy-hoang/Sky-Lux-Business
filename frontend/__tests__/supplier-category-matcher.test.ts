import {
  normalizeCategoryKey,
  isSupplierMatchSection,
  getCategoryDisplayName,
  getCategoryBadgeColor,
} from '@/components/dossiers/edit-import/utils/supplier-category-matcher';

describe('Supplier Category Matcher (Ticket 03)', () => {
  describe('normalizeCategoryKey', () => {
    it('normalizes transportation variants to XE', () => {
      expect(normalizeCategoryKey('Dịch vụ xe')).toBe('XE');
      expect(normalizeCategoryKey('3. XE VẬN CHUYỂN')).toBe('XE');
      expect(normalizeCategoryKey('VẬN CHUYỂN')).toBe('XE');
      expect(normalizeCategoryKey('Xe du lịch 16-45c')).toBe('XE');
      expect(normalizeCategoryKey('transportation')).toBe('XE');
    });

    it('normalizes restaurant/dining variants to NHA_HANG', () => {
      expect(normalizeCategoryKey('Nhà hàng')).toBe('NHA_HANG');
      expect(normalizeCategoryKey('4. NHÀ HÀNG')).toBe('NHA_HANG');
      expect(normalizeCategoryKey('ĂN UỐNG')).toBe('NHA_HANG');
      expect(normalizeCategoryKey('Ẩm thực & Nhà hàng')).toBe('NHA_HANG');
      expect(normalizeCategoryKey('Cơm niêu')).toBe('NHA_HANG');
    });

    it('normalizes airline variants to VE_MAY_BAY', () => {
      expect(normalizeCategoryKey('Vé máy bay')).toBe('VE_MAY_BAY');
      expect(normalizeCategoryKey('1. VÉ MÁY BAY')).toBe('VE_MAY_BAY');
      expect(normalizeCategoryKey('Hàng không')).toBe('VE_MAY_BAY');
      expect(normalizeCategoryKey('Flight ticket')).toBe('VE_MAY_BAY');
    });

    it('normalizes sightseeing variants to VE_THAM_QUAN', () => {
      expect(normalizeCategoryKey('Vé tham quan')).toBe('VE_THAM_QUAN');
      expect(normalizeCategoryKey('5. VÉ THAM QUAN')).toBe('VE_THAM_QUAN');
      expect(normalizeCategoryKey('Điểm đến du lịch')).toBe('VE_THAM_QUAN');
      expect(normalizeCategoryKey('Vé vào cổng')).toBe('VE_THAM_QUAN');
    });

    it('normalizes hotel variants to KHACH_SAN', () => {
      expect(normalizeCategoryKey('Khách sạn')).toBe('KHACH_SAN');
      expect(normalizeCategoryKey('2. KHÁCH SẠN')).toBe('KHACH_SAN');
      expect(normalizeCategoryKey('Lưu trú')).toBe('KHACH_SAN');
      expect(normalizeCategoryKey('Vinpearl Resort')).toBe('KHACH_SAN');
      expect(normalizeCategoryKey('Homestay')).toBe('KHACH_SAN');
    });

    it('normalizes guide and insurance variants', () => {
      expect(normalizeCategoryKey('Hướng dẫn viên')).toBe('HDV');
      expect(normalizeCategoryKey('HDV')).toBe('HDV');
      expect(normalizeCategoryKey('Bảo hiểm du lịch')).toBe('BAO_HIEM');
    });

    it('returns OTHER for unknown or undefined categories', () => {
      expect(normalizeCategoryKey(undefined)).toBe('OTHER');
      expect(normalizeCategoryKey('')).toBe('OTHER');
      expect(normalizeCategoryKey('Chi phí linh tinh')).toBe('OTHER');
    });
  });

  describe('isSupplierMatchSection', () => {
    it('matches supplier type with estimate cost section correctly', () => {
      expect(isSupplierMatchSection('Dịch vụ xe', '3. XE VẬN CHUYỂN')).toBe(true);
      expect(isSupplierMatchSection('Nhà hàng', '4. NHÀ HÀNG')).toBe(true);
      expect(isSupplierMatchSection('Vé máy bay', '1. VÉ MÁY BAY')).toBe(true);
      expect(isSupplierMatchSection('Vé tham quan', '5. VÉ THAM QUAN')).toBe(true);
      expect(isSupplierMatchSection('Khách sạn', '2. KHÁCH SẠN')).toBe(true);
    });

    it('rejects mismatched supplier types', () => {
      expect(isSupplierMatchSection('Dịch vụ xe', '4. NHÀ HÀNG')).toBe(false);
      expect(isSupplierMatchSection('Khách sạn', '3. XE VẬN CHUYỂN')).toBe(false);
      expect(isSupplierMatchSection('Vé máy bay', '5. VÉ THAM QUAN')).toBe(false);
    });

    it('handles empty or unrecognized values safely', () => {
      expect(isSupplierMatchSection(undefined, '3. XE VẬN CHUYỂN')).toBe(false);
      expect(isSupplierMatchSection('Dịch vụ xe', undefined)).toBe(false);
      expect(isSupplierMatchSection('Khác', '3. XE VẬN CHUYỂN')).toBe(false);
    });
  });

  describe('getCategoryBadgeColor and getCategoryDisplayName', () => {
    it('returns valid Ant Design colors and readable names', () => {
      expect(getCategoryBadgeColor('Dịch vụ xe')).toBe('blue');
      expect(getCategoryBadgeColor('Nhà hàng')).toBe('cyan');
      expect(getCategoryBadgeColor('Vé máy bay')).toBe('purple');
      expect(getCategoryBadgeColor('Vé tham quan')).toBe('orange');
      expect(getCategoryBadgeColor('Khách sạn')).toBe('geekblue');
      expect(getCategoryBadgeColor('Khác')).toBe('default');

      expect(getCategoryDisplayName('XE')).toBe('Dịch vụ xe');
      expect(getCategoryDisplayName('NHA_HANG')).toBe('Nhà hàng');
    });
  });
});
