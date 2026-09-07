import type { PackageResponse } from '@packmind/types';

/**
 * When a package appeared, and when it last changed.
 *
 * Asked for as insight to sort packages by activity and spot outdated ones.
 * Both dates come from the row: `updatedAt` moves when the package is renamed,
 * described, or when what it holds changes, which is the whole of what anyone
 * does to a package. A component gaining a version of its own is not counted -
 * that is the component's activity, and the distribution surfaces already say
 * when it last left for a repository.
 *
 * `changedAt` is null when nothing has happened since creation, which is the
 * common case for a package someone made and filled in one sitting: the row's
 * two columns are then the same instant, and printing both would say one thing
 * twice.
 */
export type PackageActivity = {
  createdAt: string;
  /** Null when the package has not changed since it was created. */
  changedAt: string | null;
};

/**
 * Reads the two dates off a package, or nothing when it has none.
 *
 * Nothing rather than a fallback, because the alternative is inventing a date:
 * the payload has carried both since the table was written, but fixtures build
 * this shape by hand, and a surface is better off saying less than saying
 * something untrue about when a package appeared.
 */
export function packageActivity(
  pkg: Pick<PackageResponse, 'createdAt' | 'updatedAt'>,
): PackageActivity | null {
  if (!pkg.createdAt) return null;

  const created = new Date(pkg.createdAt).getTime();
  if (Number.isNaN(created)) return null;

  const changed = pkg.updatedAt ? new Date(pkg.updatedAt).getTime() : NaN;
  const hasChanged = !Number.isNaN(changed) && changed > created;

  return {
    createdAt: pkg.createdAt,
    changedAt: hasChanged ? (pkg.updatedAt as string) : null,
  };
}
