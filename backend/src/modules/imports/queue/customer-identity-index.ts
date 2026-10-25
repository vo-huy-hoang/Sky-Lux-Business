export interface CustomerIdentity {
  id: string;
  displayName?: string | null;
  phone?: string | null;
  email?: string | null;
}

export function normalizeCustomerPhone(value?: string | null): string {
  return String(value ?? '').replace(/\D/g, '');
}

export function normalizeCustomerEmail(value?: string | null): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

export function normalizeCustomerName(value?: string | null): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * CustomerIdentityIndex: Multi-Key In-Memory Hash Map index
 * Tra cứu O(1) theo số điện thoại và email cho quá trình Import Excel hàng loạt.
 * Giảm độ phức tạp từ O(N * M) xuống O(N + M).
 */
export class CustomerIdentityIndex {
  private phoneMap = new Map<string, CustomerIdentity[]>();
  private emailMap = new Map<string, CustomerIdentity[]>();
  private exactPairSet = new Set<string>();
  private candidateById = new Map<string, CustomerIdentity>();

  constructor(initialCandidates: CustomerIdentity[] = []) {
    for (const candidate of initialCandidates) {
      this.addCandidate(candidate);
    }
  }

  /**
   * Thêm một danh tính khách hàng vào bảng băm trong O(1).
   */
  addCandidate(candidate: CustomerIdentity): void {
    if (!candidate || !candidate.id) return;

    this.candidateById.set(candidate.id, candidate);

    const normPhone = normalizeCustomerPhone(candidate.phone);
    if (normPhone) {
      let list = this.phoneMap.get(normPhone);
      if (!list) {
        list = [];
        this.phoneMap.set(normPhone, list);
      }
      list.push(candidate);
    }

    const normEmail = normalizeCustomerEmail(candidate.email);
    if (normEmail) {
      let list = this.emailMap.get(normEmail);
      if (!list) {
        list = [];
        this.emailMap.set(normEmail, list);
      }
      list.push(candidate);
    }

    if (normPhone && normEmail) {
      this.exactPairSet.add(`${normPhone}:::${normEmail}`);
    }
  }

  /**
   * Kiểm tra cặp (phone, email) đã tồn tại chính xác trong O(1).
   */
  hasExactIdentity(phone?: string | null, email?: string | null): boolean {
    const np = normalizeCustomerPhone(phone);
    const ne = normalizeCustomerEmail(email);
    if (!np || !ne) return false;
    return this.exactPairSet.has(`${np}:::${ne}`);
  }

  /**
   * Tra cứu danh sách khách hàng có cùng số điện thoại trong O(1).
   */
  getPhoneMatches(phone?: string | null): CustomerIdentity[] {
    const np = normalizeCustomerPhone(phone);
    return np ? this.phoneMap.get(np) || [] : [];
  }

  /**
   * Tra cứu danh sách khách hàng có cùng email trong O(1).
   */
  getEmailMatches(email?: string | null): CustomerIdentity[] {
    const ne = normalizeCustomerEmail(email);
    return ne ? this.emailMap.get(ne) || [] : [];
  }

  /**
   * Kiểm tra xung đột định danh khách hàng trong O(1) thay vì O(M).
   * Giữ nguyên 100% logic cảnh báo và nội dung thông báo gốc.
   */
  checkConflict(phone: string, email: string, name: string): string | null {
    const normPhone = normalizeCustomerPhone(phone);
    const normEmail = normalizeCustomerEmail(email);
    if (!normPhone && !normEmail) return null;

    const phoneMatches = this.getPhoneMatches(phone);
    const emailMatches = this.getEmailMatches(email);

    const phoneIds = new Set(phoneMatches.map((c) => c.id));
    const emailIds = new Set(emailMatches.map((c) => c.id));
    const matchedIds = new Set([...phoneIds, ...emailIds]);

    if (!matchedIds.size) return null;

    const exactPairMatch =
      Boolean(normPhone) &&
      Boolean(normEmail) &&
      phoneIds.size === 1 &&
      emailIds.size === 1 &&
      [...phoneIds][0] === [...emailIds][0];

    if (exactPairMatch) {
      const matchedCustomer = phoneMatches[0];
      if (
        normalizeCustomerName(matchedCustomer.displayName) ===
        normalizeCustomerName(name)
      ) {
        return null;
      }

      return `Cảnh báo xung đột khách hàng: số điện thoại và email khớp khách hàng "${matchedCustomer.displayName}" nhưng tên trong file là "${name}". Không tự động gộp hồ sơ; hãy kiểm tra và chọn lại dữ liệu.`;
    }

    const matchedCustomers: CustomerIdentity[] = [];
    for (const id of matchedIds) {
      const c = this.candidateById.get(id);
      if (c) matchedCustomers.push(c);
    }

    const names = matchedCustomers
      .map((customer) => customer.displayName || customer.id)
      .filter(Boolean)
      .map((n) => `"${n}"`)
      .join(', ');

    if (phoneMatches.length && emailMatches.length) {
      return `Cảnh báo xung đột khách hàng: số điện thoại và email đang thuộc các khách hàng khác nhau (${names}). Không tự động gộp hồ sơ; hãy kiểm tra và chọn lại dữ liệu.`;
    }

    const matchedField = phoneMatches.length ? 'số điện thoại' : 'email';
    return `Cảnh báo khách hàng: ${matchedField} đã thuộc khách hàng ${names || 'khác'}, nhưng thông tin còn lại không khớp. Không tự động gộp hồ sơ; hãy kiểm tra và chọn lại dữ liệu.`;
  }
}
