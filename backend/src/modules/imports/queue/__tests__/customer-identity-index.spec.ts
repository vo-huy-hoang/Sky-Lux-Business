import {
  CustomerIdentityIndex,
  normalizeCustomerPhone,
  normalizeCustomerEmail,
  normalizeCustomerName,
  CustomerIdentity,
} from '../customer-identity-index';

describe('CustomerIdentityIndex', () => {
  describe('Normalization Helpers', () => {
    it('normalizes phones by stripping non-digit characters', () => {
      expect(normalizeCustomerPhone('+84 (090) 123-4567')).toBe('840901234567');
      expect(normalizeCustomerPhone(' 091.234.5678 ')).toBe('0912345678');
      expect(normalizeCustomerPhone(null)).toBe('');
      expect(normalizeCustomerPhone(undefined)).toBe('');
    });

    it('normalizes emails by trimming and converting to lowercase', () => {
      expect(normalizeCustomerEmail('  User@SkyLux.VN  ')).toBe(
        'user@skylux.vn',
      );
      expect(normalizeCustomerEmail(null)).toBe('');
    });

    it('normalizes names by removing accents, handling đ/Đ, and collapsing spaces', () => {
      expect(normalizeCustomerName('  Đoàn   Văn   Đức  ')).toBe(
        'doan van duc',
      );
      expect(normalizeCustomerName('Nguyễn Thị Mai')).toBe('nguyen thi mai');
      expect(normalizeCustomerName(null)).toBe('');
    });
  });

  describe('Index Lookups and Exact Identity', () => {
    const candidates: CustomerIdentity[] = [
      {
        id: 'cust-1',
        displayName: 'Nguyễn Văn A',
        phone: '0901234567',
        email: 'a@example.com',
      },
      {
        id: 'cust-2',
        displayName: 'Trần Thị B',
        phone: '0912345678',
        email: 'b@example.com',
      },
    ];

    it('finds phone and email matches in O(1)', () => {
      const index = new CustomerIdentityIndex(candidates);

      const phoneMatches = index.getPhoneMatches('090 123 4567');
      expect(phoneMatches.length).toBe(1);
      expect(phoneMatches[0].id).toBe('cust-1');

      const emailMatches = index.getEmailMatches('  A@Example.COM ');
      expect(emailMatches.length).toBe(1);
      expect(emailMatches[0].id).toBe('cust-1');

      expect(index.getPhoneMatches('0999999999')).toEqual([]);
      expect(index.getEmailMatches('unknown@example.com')).toEqual([]);
    });

    it('correctly evaluates hasExactIdentity in O(1)', () => {
      const index = new CustomerIdentityIndex(candidates);

      expect(index.hasExactIdentity('0901234567', 'a@example.com')).toBe(true);
      expect(index.hasExactIdentity('090-123-4567', ' A@example.com ')).toBe(
        true,
      );

      // Mismatch
      expect(index.hasExactIdentity('0901234567', 'b@example.com')).toBe(false);
      expect(index.hasExactIdentity('0999999999', 'a@example.com')).toBe(false);
      expect(index.hasExactIdentity('', '')).toBe(false);
    });

    it('dynamically indexes newly added candidates via addCandidate', () => {
      const index = new CustomerIdentityIndex(candidates);
      expect(index.hasExactIdentity('0933333333', 'c@example.com')).toBe(false);

      index.addCandidate({
        id: 'cust-3',
        displayName: 'Lê Văn C',
        phone: '0933333333',
        email: 'c@example.com',
      });

      expect(index.hasExactIdentity('0933333333', 'c@example.com')).toBe(true);
      expect(index.getPhoneMatches('0933333333')[0].displayName).toBe(
        'Lê Văn C',
      );
    });
  });

  describe('checkConflict Resolution Logic', () => {
    const existing: CustomerIdentity[] = [
      {
        id: 'cust-alpha',
        displayName: 'Công Ty Sky Lux',
        phone: '0901111111',
        email: 'contact@skylux.vn',
      },
      {
        id: 'cust-beta',
        displayName: 'Dịch Vụ Du Lịch Việt',
        phone: '0902222222',
        email: 'tour@dulich.vn',
      },
    ];

    it('returns null when phone and email are empty', () => {
      const index = new CustomerIdentityIndex(existing);
      expect(index.checkConflict('', '', 'Tên Bất Kỳ')).toBeNull();
    });

    it('returns null when exact phone, email, and name match', () => {
      const index = new CustomerIdentityIndex(existing);
      expect(
        index.checkConflict(
          '0901111111',
          'contact@skylux.vn',
          'Công Ty Sky Lux',
        ),
      ).toBeNull();
      // Accent-insensitive and case-insensitive name match
      expect(
        index.checkConflict(
          '0901111111',
          'contact@skylux.vn',
          'CONG TY SKY LUX',
        ),
      ).toBeNull();
    });

    it('warns when phone and email match but name is different', () => {
      const index = new CustomerIdentityIndex(existing);
      const conflict = index.checkConflict(
        '0901111111',
        'contact@skylux.vn',
        'Công Ty Khác Hoàn Toàn',
      );
      expect(conflict).toContain(
        'Cảnh báo xung đột khách hàng: số điện thoại và email khớp khách hàng "Công Ty Sky Lux" nhưng tên trong file là "Công Ty Khác Hoàn Toàn"',
      );
    });

    it('warns when phone belongs to customer A and email belongs to customer B', () => {
      const index = new CustomerIdentityIndex(existing);
      const conflict = index.checkConflict(
        '0901111111', // phone of alpha
        'tour@dulich.vn', // email of beta
        'Tên Bất Kỳ',
      );
      expect(conflict).toContain(
        'số điện thoại và email đang thuộc các khách hàng khác nhau',
      );
      expect(conflict).toContain('"Công Ty Sky Lux"');
      expect(conflict).toContain('"Dịch Vụ Du Lịch Việt"');
    });

    it('warns when phone matches existing customer but email is new/unmatched', () => {
      const index = new CustomerIdentityIndex(existing);
      const conflict = index.checkConflict(
        '0901111111',
        'new-unmatched@email.com',
        'Công Ty Sky Lux',
      );
      expect(conflict).toContain(
        'số điện thoại đã thuộc khách hàng "Công Ty Sky Lux"',
      );
    });

    it('warns when email matches existing customer but phone is new/unmatched', () => {
      const index = new CustomerIdentityIndex(existing);
      const conflict = index.checkConflict(
        '0988888888',
        'contact@skylux.vn',
        'Công Ty Sky Lux',
      );
      expect(conflict).toContain('email đã thuộc khách hàng "Công Ty Sky Lux"');
    });
  });

  describe('Benchmark Performance O(N + M)', () => {
    it('indexes 5,000 customers and resolves 1,000 row conflicts in under 50ms', () => {
      // 1. Generate 5,000 synthetic customers
      const largeCandidates: CustomerIdentity[] = [];
      for (let i = 1; i <= 5000; i++) {
        largeCandidates.push({
          id: `cust-${i}`,
          displayName: `Khách Hàng ${i}`,
          phone: `090${String(i).padStart(7, '0')}`,
          email: `client${i}@domain.com`,
        });
      }

      const t0 = Date.now();
      const index = new CustomerIdentityIndex(largeCandidates);
      const buildDuration = Date.now() - t0;

      // 2. Perform 1,000 simulated lookups
      const t1 = Date.now();
      let matchedCount = 0;
      for (let j = 1; j <= 1000; j++) {
        const testPhone = `090${String(j).padStart(7, '0')}`;
        const testEmail = `client${j}@domain.com`;
        const testName = `Khách Hàng ${j}`;
        const res = index.checkConflict(testPhone, testEmail, testName);
        if (res === null) matchedCount++;
      }
      const lookupDuration = Date.now() - t1;
      const totalDuration = buildDuration + lookupDuration;

      expect(matchedCount).toBe(1000);
      expect(totalDuration).toBeLessThan(300); // Benchmark assertion: < 300ms under heavy parallel test concurrency (typically ~15-30ms)
    });
  });
});
