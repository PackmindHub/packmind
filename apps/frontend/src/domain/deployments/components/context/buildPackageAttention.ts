import type { PackageId } from '@packmind/types';
import type { SpaceOutdatedPlugin } from '@packmind/proprietary/frontend/domain/spaces/components/overview/useSpaceOutdatedPlugins';
import {
  packageAttentionInstallCount,
  packageBehindInstallCount,
  packageFailedInstallCount,
} from '../redesign/selectors/buildPackageDriftOverview';
import type { PackageDrift } from '../redesign/types';

/**
 * What one package has to say for itself without being opened: how many places
 * need a hand, and what kind of trouble they are in.
 *
 * Counted in places, not in artifacts: what the user acts on is a repository to
 * redistribute to or a marketplace to republish to, and a package three
 * versions behind in one repository is one thing to fix, not three.
 *
 * The two channels are added up because both are somewhere to go and put
 * something right, which is exactly what the Distribution entry in the
 * navigation already counts. They are named apart in the tooltip because they
 * are not repaired the same way, and one number that promised a single gesture
 * would be lying about half of them.
 */
export type PackageAttention = {
  count: number;
  /**
   * Red when a push broke, orange when something is merely late. The precedence
   * the Distribution rail already applies to its own rows: a failure is the
   * part a redistribution may not fix on its own, so it takes the louder mark.
   */
  tone: 'error' | 'warning';
  /** Read on hover and by a screen reader, where a bare number says nothing. */
  tooltip: string;
};

/**
 * `undefined` when there is nothing to say, which is the common case: a mark
 * that is always there, saying zero, trains the eye to stop reading it.
 *
 * A package with no drift data and no stale plugin gets nothing too, because
 * "not distributed anywhere" is not a problem this can state in one number. The
 * difference between that and "aligned everywhere" is said in words one level
 * down, in the Distribution tab; absence here means only "nothing to do about
 * this one".
 */
export function buildPackageAttention(
  pkg: PackageDrift | null,
  marketplacesToRepublish = 0,
): PackageAttention | undefined {
  const destinations = pkg ? packageAttentionInstallCount(pkg) : 0;
  const count = destinations + marketplacesToRepublish;
  if (count === 0) return undefined;

  const failed = pkg ? packageFailedInstallCount(pkg) : 0;
  const behind = pkg ? packageBehindInstallCount(pkg) : 0;

  return {
    count,
    tone: failed > 0 ? 'error' : 'warning',
    tooltip: describe(behind, failed, marketplacesToRepublish),
  };
}

/**
 * Every package of the space that needs a hand, by id.
 *
 * A map rather than a list because the rail asks it one package at a time,
 * walking a list it sorts by name; and absent rather than present-with-zero for
 * the same reason `buildPackageAttention` returns nothing.
 */
export function buildPackageAttentionIndex(
  packages: readonly PackageDrift[],
  outdatedPlugins: readonly SpaceOutdatedPlugin[],
): Map<PackageId, PackageAttention> {
  const marketplaces = marketplacesToRepublishByPackage(outdatedPlugins);
  const index = new Map<PackageId, PackageAttention>();

  for (const pkg of packages) {
    const attention = buildPackageAttention(pkg, marketplaces.get(pkg.id) ?? 0);
    if (attention) index.set(pkg.id, attention);
  }

  /*
   * A package published to a marketplace but distributed to no repository is
   * absent from the drift overview entirely, and it is precisely the one whose
   * only problem is a stale plugin. Walking the second channel too is what
   * keeps it from being the one package the rail never marks.
   */
  for (const [packageId, republishCount] of marketplaces) {
    if (index.has(packageId)) continue;
    const attention = buildPackageAttention(null, republishCount);
    if (attention) index.set(packageId, attention);
  }

  return index;
}

/**
 * How many marketplaces a package has to be republished to.
 *
 * Distinct marketplaces, not stale plugins: the gesture is per marketplace, and
 * two plugins of one package in one catalog is one place to go.
 */
function marketplacesToRepublishByPackage(
  outdatedPlugins: readonly SpaceOutdatedPlugin[],
): Map<PackageId, number> {
  const byPackage = new Map<PackageId, Set<string>>();

  for (const plugin of outdatedPlugins) {
    const seen = byPackage.get(plugin.packageId) ?? new Set<string>();
    seen.add(plugin.marketplaceId);
    byPackage.set(plugin.packageId, seen);
  }

  return new Map(
    [...byPackage].map(([packageId, seen]) => [packageId, seen.size]),
  );
}

/**
 * The three parts are stated separately rather than added up: the first two
 * overlap, since a destination whose last push failed is usually also behind,
 * and the third is not repaired by the same gesture as either.
 */
function describe(
  behind: number,
  failed: number,
  marketplaces: number,
): string {
  const parts: string[] = [];

  if (behind > 0) {
    parts.push(`${behind} destination${behind === 1 ? '' : 's'} behind`);
  }
  if (failed > 0) {
    const noun = behind > 0 ? '' : `destination${failed === 1 ? '' : 's'} `;
    parts.push(`${failed} ${noun}with a failed distribution`);
  }
  /*
   * "To republish" rather than "behind", the wording the navigation badge
   * already uses: calling both of them behind would promise that whatever fixes
   * the repositories covers these too. It does not.
   */
  if (marketplaces > 0) {
    parts.push(
      `${marketplaces} marketplace${marketplaces === 1 ? '' : 's'} to republish`,
    );
  }

  return parts.join(', ');
}
