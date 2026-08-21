import type { PackageId, PackageResponse } from '@packmind/types';
import {
  buildPackageContext,
  type ContextComponent,
  type ContextLinkTarget,
  type SpaceCatalogue,
} from './buildPackageContext';

export type PackageSearchRow = {
  pkg: PackageResponse;
  /**
   * The components of this package the query reached. Empty when nothing is
   * typed, and empty on a package the query only reached by its own name.
   */
  matches: ContextComponent[];
  /**
   * This row is here because the pane is showing it, not because the query
   * reached it. Nothing else in the result is pinned.
   */
  isPinned: boolean;
};

export type PackageSearchResult = {
  rows: PackageSearchRow[];
  /** Trimmed and folded, for the callers that mark the matched fragment. */
  needle: string;
  /**
   * Rows the query actually reached. Kept apart from `rows.length` so a pinned
   * package can never be read as a result: a search that finds nothing still
   * has to say so, under the pin.
   */
  matchCount: number;
};

/**
 * The rail's list for a given query: the packages whose name or description
 * matched, plus the packages holding a component that matched, each carrying
 * the components in question.
 *
 * Searching the components too is the point. The navigation this surface
 * replaces had one entry per component type, so "where is the naming standard"
 * was answered by going to Standards. Here the index is the package, and a rail
 * that only matched package names would make the user open packages one by one
 * to find a component whose name they already know.
 *
 * Components in no package are not reachable from here, whatever the query:
 * this walks the packages. The space-wide inventory is where those live, which
 * is what the rail's empty state has to say.
 *
 * Pure, so the whole decision — what matches, what is hoisted, what counts as a
 * result — is testable without a router or a query client.
 */
export function searchPackages(
  packages: readonly PackageResponse[],
  catalogue: SpaceCatalogue,
  target: ContextLinkTarget,
  {
    query,
    selectedPackageId,
  }: Readonly<{ query: string; selectedPackageId: PackageId | null }>,
): PackageSearchResult {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return {
      rows: packages.map((pkg) => ({ pkg, matches: [], isPinned: false })),
      needle,
      matchCount: packages.length,
    };
  }

  const contains = (text: string) => text.toLowerCase().includes(needle);

  const hits: PackageSearchRow[] = [];
  for (const pkg of packages) {
    const named = contains(pkg.name) || contains(pkg.description ?? '');
    const matches = componentsOf(pkg, catalogue, target).filter(
      (component) => contains(component.name) || contains(component.summary),
    );
    if (named || matches.length > 0) {
      hits.push({ pkg, matches, isPinned: false });
    }
  }

  return {
    rows: hoistSelected(hits, packages, selectedPackageId),
    needle,
    matchCount: hits.length,
  };
}

/**
 * The package the pane is showing sits first while a search is running,
 * whether or not the query reached it.
 *
 * Filtering the open package out of the rail while the pane keeps showing it
 * leaves the user looking at a package the list says does not exist, with no
 * row to click to get back to it. Hoisting it costs one row.
 */
function hoistSelected(
  hits: readonly PackageSearchRow[],
  packages: readonly PackageResponse[],
  selectedPackageId: PackageId | null,
): PackageSearchRow[] {
  if (!selectedPackageId) return [...hits];

  const index = hits.findIndex((row) => row.pkg.id === selectedPackageId);
  if (index === 0) return [...hits];
  if (index > 0) {
    return [hits[index], ...hits.slice(0, index), ...hits.slice(index + 1)];
  }

  const selected = packages.find((pkg) => pkg.id === selectedPackageId);
  if (!selected) return [...hits];
  return [{ pkg: selected, matches: [], isPinned: true }, ...hits];
}

/**
 * What a package holds, flat. Built through the same selector the pane uses, so
 * a component the rail offers is one the pane will show, resolved and sorted
 * the same way.
 */
function componentsOf(
  pkg: PackageResponse,
  catalogue: SpaceCatalogue,
  target: ContextLinkTarget,
): ContextComponent[] {
  return buildPackageContext(pkg, catalogue, target).groups.flatMap(
    (group) => group.components,
  );
}
