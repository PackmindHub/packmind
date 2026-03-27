import { useMemo, useCallback } from 'react';

export function useArtifactNameValidator(
  existingNames: string[],
  excludeName?: string,
): (name: string) => string | null {
  const namesSet = useMemo(() => {
    const lower = new Set(existingNames.map((n) => n.toLowerCase()));
    if (excludeName) {
      lower.delete(excludeName.toLowerCase());
    }
    return lower;
  }, [existingNames, excludeName]);

  return useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      if (namesSet.has(trimmed.toLowerCase())) {
        return 'An artifact with this name already exists in this space';
      }
      return null;
    },
    [namesSet],
  );
}
