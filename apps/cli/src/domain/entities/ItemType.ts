/**
 * The three artefact kinds a package can hold. Shared by the package
 * membership use cases (`add`, `move`, `remove`), which all take one kind at a
 * time.
 */
export type ItemType = 'standard' | 'command' | 'skill';

/** Capitalised singular or plural, for user-facing sentences. */
export function formatItemType(itemType: ItemType, count: number): string {
  const singular = itemType.charAt(0).toUpperCase() + itemType.slice(1);
  return count === 1 ? singular : `${singular}s`;
}
