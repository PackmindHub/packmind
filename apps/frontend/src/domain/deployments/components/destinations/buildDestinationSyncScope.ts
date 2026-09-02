import type { PackageId } from '@packmind/types';
import { packageBehindInstallCount } from '../redesign/selectors/buildPackageDriftOverview';
import type { SyncScope } from '../redesign/components/SyncSurface';
import type { Destination } from './buildSpaceDestinations';

/**
 * What to redistribute for a set of picked destinations.
 *
 * The confirmation surface takes packages, because a distribution writes one
 * package into one place. This rail hands it destinations, so the pivot happens
 * here: the packages behind in the picked repositories, and the exact
 * `${repoId}::${targetId}` landings to touch. Without that filter the same
 * package would be redistributed everywhere it lives, including repositories
 * the user did not pick.
 *
 * Marketplaces are skipped. Republishing is a different call, offered by the
 * marketplace pane over its own plugins, and a batch that silently republished
 * a catalog because it was ticked in the same list would be the kind of surprise
 * this screen exists to remove.
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

  for (const destination of destinations) {
    if (!pickedIds.has(destination.id)) continue;
    if (destination.kind !== 'repository') continue;

    for (const target of destination.repository.targets) {
      for (const pkg of target.packages) {
        if (packageBehindInstallCount(pkg) === 0) continue;
        packageIds.add(pkg.id);
        installKeys.add(`${destination.repository.id}::${target.id}`);
      }
    }
  }

  if (packageIds.size === 0 || installKeys.size === 0) return null;

  return {
    kind: 'bulk',
    packageIds: Array.from(packageIds),
    installKeyFilter: installKeys,
  };
}
