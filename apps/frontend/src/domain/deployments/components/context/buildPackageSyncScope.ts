import type { PackageId } from '@packmind/types';
import type {
  MarketplaceSyncTarget,
  SyncScope,
} from '../redesign/components/SyncSurface';
import type { MarketplaceDrift } from '../redesign/types';
import type { PackageDestination } from './buildPackageDestinations';

/**
 * What to send for the rows the reader picked.
 *
 * The confirmation takes packages and catalogs, and the list hands back
 * destinations, so the pivot happens here. It is the same pivot the
 * Distribution rail makes in `buildDestinationSyncScope`, one level down: that
 * one starts from repositories holding several packages, this one from the
 * landings of a single package.
 *
 * Its own file rather than a helper under the tab, because it is the whole of
 * what a click on `Update` decides and none of it is rendering. Inline it could
 * only be exercised by mounting the tab, which means mounting three hooks and a
 * confirmation surface to assert on the shape of an object.
 */
export function buildPackageSyncScope(
  picked: readonly PackageDestination[],
  packageId: PackageId,
  marketplaces: readonly MarketplaceDrift[],
): SyncScope | null {
  const installKeys = picked
    .map((destination) => destination.installKey)
    .filter((key): key is string => key !== null);

  const targets: MarketplaceSyncTarget[] = [];
  for (const destination of picked) {
    if (destination.kind !== 'marketplace') continue;
    const marketplace = marketplaces.find(
      (candidate) => `m:${candidate.id}` === destination.key,
    );
    if (!marketplace) continue;
    /*
     * This package's plugins and no others. The drift is read across the space,
     * so a catalog carrying three outdated plugins from three packages would
     * otherwise republish all three from a tab that is about one.
     */
    const plugins = marketplace.plugins.filter(
      (plugin) => plugin.packageId === packageId,
    );
    if (plugins.length > 0) targets.push({ marketplace, plugins });
  }

  /*
   * A pick of landings alone keeps the narrow scope it always had, rather than
   * being dressed as a batch of one package: the confirmation reads the two
   * differently, and there was no reason for every row on this tab to start
   * taking the wider path because some picks now can.
   *
   * Null when nothing would be sent, which the caller reads as "do not open the
   * confirmation at all".
   */
  if (targets.length === 0) {
    return installKeys.length > 0
      ? { kind: 'package', packageId, installKeys }
      : null;
  }

  return {
    kind: 'bulk',
    packageIds: installKeys.length > 0 ? [packageId] : [],
    installKeyFilter: new Set(installKeys),
    marketplaces: targets,
  };
}
