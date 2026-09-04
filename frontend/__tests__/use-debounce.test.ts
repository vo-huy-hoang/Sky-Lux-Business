import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../hooks/use-debounce';

describe('useDebounce Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 350));
    expect(result.current).toBe('initial');
  });

  it('should debounce value change after specified delay', () => {
    const { result, rerender } = renderHook(
      ({ val, delay }: { val: string; delay?: number }) => useDebounce(val, delay),
      { initialProps: { val: 'first', delay: 350 } },
    );

    expect(result.current).toBe('first');

    // Cập nhật giá trị mới
    rerender({ val: 'second', delay: 350 });
    // Giá trị chưa đổi ngay lập tức
    expect(result.current).toBe('first');

    // Chạy đồng hồ 200ms (chưa đủ 350ms)
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('first');

    // Chạy thêm 150ms (tổng cộng 350ms)
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(result.current).toBe('second');
  });

  it('should cancel previous timer when value changes rapidly', () => {
    const { result, rerender } = renderHook(
      ({ val }: { val: string }) => useDebounce(val, 300),
      { initialProps: { val: 'v1' } },
    );

    // Thay đổi liên tục trước khi timeout hoàn tất
    rerender({ val: 'v2' });
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(result.current).toBe('v1');

    rerender({ val: 'v3' });
    act(() => {
      jest.advanceTimersByTime(150);
    });
    // Vẫn là v1 vì v2 bị hủy và v3 mới chạy được 150ms
    expect(result.current).toBe('v1');

    // Chạy nốt 150ms còn lại cho v3
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(result.current).toBe('v3');
  });

  it('should cleanup timer on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const { unmount } = renderHook(() => useDebounce('test', 300));
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
