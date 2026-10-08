import { act, renderHook } from '@testing-library/react';

import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderDebounced = () =>
    renderHook(({ value }) => useDebouncedValue(value, 250), {
      initialProps: { value: 'a' },
    });

  it('starts with the initial value', () => {
    const { result } = renderDebounced();

    expect(result.current).toBe('a');
  });

  describe('when the value changes', () => {
    it('keeps the previous value until the delay elapses', () => {
      const { result, rerender } = renderDebounced();
      rerender({ value: 'ab' });
      act(() => vi.advanceTimersByTime(249));

      expect(result.current).toBe('a');
    });

    it('takes the new value once the delay elapses', () => {
      const { result, rerender } = renderDebounced();
      rerender({ value: 'ab' });
      act(() => vi.advanceTimersByTime(250));

      expect(result.current).toBe('ab');
    });
  });

  describe('when the value changes again before the delay elapses', () => {
    it('restarts the delay from the latest change', () => {
      const { result, rerender } = renderDebounced();
      rerender({ value: 'ab' });
      act(() => vi.advanceTimersByTime(200));
      rerender({ value: 'abc' });
      act(() => vi.advanceTimersByTime(200));

      expect(result.current).toBe('a');
    });

    it('settles on the latest value', () => {
      const { result, rerender } = renderDebounced();
      rerender({ value: 'ab' });
      act(() => vi.advanceTimersByTime(200));
      rerender({ value: 'abc' });
      act(() => vi.advanceTimersByTime(250));

      expect(result.current).toBe('abc');
    });
  });
});
