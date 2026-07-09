import { ExternalRepository } from '@packmind/types';

// Orders repositories alphabetically by their `owner/name` full name, matching
// how the UI lists them. Sharing one comparator keeps every provider's response
// ordered the same way, so "load more" appends to the bottom of the list.
export function byFullName(
  a: ExternalRepository,
  b: ExternalRepository,
): number {
  return `${a.owner}/${a.name}`.localeCompare(`${b.owner}/${b.name}`);
}
