import { useEffect, useRef, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates once `delay` ms have
 * elapsed without a change. Used to throttle search-as-you-type so we don't
 * fire a backend query on every keystroke.
 *
 * Mirrors the manual `setTimeout`/`clearTimeout` pattern already used across
 * the app (e.g. organization-name validation); no extra debounce dependency.
 */
export const useDebouncedValue = <T>(value: T, delay = 250): T => {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay]);

  return debounced;
};
