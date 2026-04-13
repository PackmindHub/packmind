export function sortSpacesByName<T extends { name: string }>(
  spaces: readonly T[],
): T[] {
  return [...spaces].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}
