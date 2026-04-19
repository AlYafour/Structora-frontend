import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated', delay: 300 });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('updated');
  });

  it('cancels previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'change1' });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: 'change2' });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: 'change3' });
    act(() => { vi.advanceTimersByTime(300); });

    expect(result.current).toBe('change3');
  });

  it('uses default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe('initial');

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('updated');
  });

  it('cleans up timeout on unmount', () => {
    const { unmount } = renderHook(() => useDebounce('test', 300));
    expect(() => unmount()).not.toThrow();
  });
});
