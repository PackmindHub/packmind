import type { ContextComponentType, ContextGroup } from './buildPackageContext';

export type ComponentFilter = Readonly<{
  /** What is typed in the field, raw: trimming is this file's business. */
  query: string;
  /** The picked type, or null for every type. */
  type: ContextComponentType | null;
}>;

export type FilteredGroup = ContextGroup & {
  /**
   * How many the group holds before the query, which is what lets the band
   * header say "3 of 40" rather than making the reader wonder where the rest
   * went.
   */
  total: number;
};

export type FilteredGroups = {
  /** The groups with something left, in the order they were given. */
  groups: FilteredGroup[];
  /** What the query left, across every group. */
  shownCount: number;
  /** What the package holds, which the empty state contrasts against. */
  totalCount: number;
};

/**
 * A package's groups, narrowed by what is typed and by the picked type.
 *
 * The same match as the rail's search: a case-insensitive substring of the name
 * or of the summary. One idea of what "matching" means on this surface, so a
 * query that hoists a package in the rail also finds the component once the
 * package is open.
 *
 * A group the query empties is dropped rather than shown reading zero. The band
 * header exists to break a long list into readable runs, and a run of nothing
 * is not one; the counts on the chips above are where the zero belongs, since
 * those are counted before the query and are the control that would undo it.
 *
 * Pure, so what is on screen under a filter can be asserted without a DOM.
 */
export function filterPackageGroups(
  groups: readonly ContextGroup[],
  { query, type }: ComponentFilter,
): FilteredGroups {
  const needle = query.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(needle);

  const filtered: FilteredGroup[] = [];
  let shownCount = 0;
  let totalCount = 0;

  for (const group of groups) {
    totalCount += group.components.length;
    if (type !== null && group.type !== type) continue;

    const components = needle
      ? group.components.filter(
          (component) => matches(component.name) || matches(component.summary),
        )
      : group.components;

    if (components.length === 0) continue;

    shownCount += components.length;
    filtered.push({ ...group, components, total: group.components.length });
  }

  return { groups: filtered, shownCount, totalCount };
}
