import { useEffect, useState } from 'react';

/**
 * The value as it was once it stopped changing for `delayMs`, so that typing
 * triggers one request when the user pauses rather than one per keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
