import type { PackageId } from '@packmind/types';
import { packageBehindInstallCount } from '../redesign/selectors/buildPackageDriftOverview';
import type {
  MarketplaceSyncTarget,
  SyncScope,
} from '../redesign/components/SyncSurface';
import type { Destination } from './buildSpaceDestinations';

/**
 * What to distribute for a set of picked destinations.
 *
 * The confirmation surface takes packages, because a distribution writes one
 * package into one place. This rail hands it destinations, so the pivot happens
 * here: the packages behind in the picked repositories, and the exact
 * `${repoId}::${targetId}` landings to touch. Without that filter the same
 * package would be distributed everywhere it lives, including repositories
 * the user did not pick.
 *
 * Picked marketplaces ride along in a lane of their own, drifted plugins only.
 * They are not folded into the package list: a plugin is not written by the
 * same call, and the surface states the two mechanisms apart precisely because
 * one is finished when it returns and the other waits on a merge.
 *
 * Returns null when nothing would be sent, which the caller reads as "do not
 * open the confirmation at all".
 */
export function buildDestinationSyncScope(
  destinations: readonly Destination[],
  pickedIds: ReadonlySet<string>,
): SyncScope | null {
  const packageIds = new Set<PackageId>();
  const installKeys = new Set<string>();
  const marketplaces: MarketplaceSyncTarget[] = [];

  for (const destination of destinations) {
    if (!pickedIds.has(destination.id)) continue;

    if (destination.kind === 'marketplace') {
      const { marketplace } = destination;
      if (marketplace.plugins.length > 0) {
        marketplaces.push({ marketplace, plugins: marketplace.plugins });
      }
      continue;
    }

    for (const target of destination.repository.targets) {
      for (const pkg of target.packages) {
        if (packageBehindInstallCount(pkg) === 0) continue;
        packageIds.add(pkg.id);
        installKeys.add(`${destination.repository.id}::${target.id}`);
      }
    }
  }

  /*
   * Each half is judged on its own. A pick of catalogs alone carries no package
   * id, and the guard that asked for one used to turn it into "nothing to do".
   */
  const hasRepositorySide = packageIds.size > 0 && installKeys.size > 0;
  if (!hasRepositorySide && marketplaces.length === 0) return null;

  return {
    kind: 'bulk',
    packageIds: Array.from(packageIds),
    installKeyFilter: installKeys,
    marketplaces,
  };
}
