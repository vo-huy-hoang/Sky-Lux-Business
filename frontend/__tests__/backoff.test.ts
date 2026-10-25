import { calculateBackoffWithJitter } from '@/lib/backoff';

describe('calculateBackoffWithJitter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('trả về 0ms cho lần thử 0 hoặc âm (Fast Immediate Retry)', () => {
    expect(calculateBackoffWithJitter(0)).toBe(0);
    expect(calculateBackoffWithJitter(-1)).toBe(0);
    expect(calculateBackoffWithJitter(-99)).toBe(0);
  });

  it('tính toán delay chính xác khi mock Math.random', () => {
    // Math.random trả về 0.5
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    // attempt 1: baseDelay = 500 -> exponential = 500 * 2^0 = 500 -> 0.5 * 500 = 250
    expect(calculateBackoffWithJitter(1)).toBe(250);

    // attempt 2: baseDelay = 500 -> exponential = 500 * 2^1 = 1000 -> 0.5 * 1000 = 500
    expect(calculateBackoffWithJitter(2)).toBe(500);

    // attempt 3: baseDelay = 500 -> exponential = 500 * 2^2 = 2000 -> 0.5 * 2000 = 1000
    expect(calculateBackoffWithJitter(3)).toBe(1000);

    // attempt 4: baseDelay = 500 -> exponential = 500 * 2^3 = 4000 -> 0.5 * 4000 = 2000
    expect(calculateBackoffWithJitter(4)).toBe(2000);

    // attempt 5: exponential = min(5000, 500 * 2^4 = 8000) = 5000 -> 0.5 * 5000 = 2500
    expect(calculateBackoffWithJitter(5)).toBe(2500);
  });

  it('tuân thủ giới hạn trần maxDelay khi attempt lớn', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.999);

    // attempt 10 với maxDelay = 5000ms -> kết quả < 5000
    const delay = calculateBackoffWithJitter(10);
    expect(delay).toBeLessThanOrEqual(5000);
    expect(delay).toBeGreaterThan(4900);
  });

  it('hỗ trợ tùy biến baseDelay và maxDelay', () => {
    jest.spyOn(Math, 'random').mockReturnValue(1.0);

    // baseDelay = 100, maxDelay = 800
    // attempt 1: min(800, 100 * 2^0) = 100
    expect(calculateBackoffWithJitter(1, 100, 800)).toBe(100);

    // attempt 2: min(800, 100 * 2^1) = 200
    expect(calculateBackoffWithJitter(2, 100, 800)).toBe(200);

    // attempt 4: min(800, 100 * 2^3) = 800 (chạm trần maxDelay)
    expect(calculateBackoffWithJitter(4, 100, 800)).toBe(800);

    // attempt 5: vẫn chạm trần 800
    expect(calculateBackoffWithJitter(5, 100, 800)).toBe(800);
  });

  it('trả về giá trị số nguyên không âm trong 100 lần chạy ngẫu nhiên', () => {
    for (let attempt = 1; attempt <= 10; attempt++) {
      const delay = calculateBackoffWithJitter(attempt);
      expect(Number.isInteger(delay)).toBe(true);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(5000);
    }
  });
});
