import { createMarketplaceId, createPackageId } from '@packmind/types';
import type { MarketplaceDrift } from '../redesign/types';
import type { PackageDestination } from './buildPackageDestinations';
import { buildPackageSyncScope } from './buildPackageSyncScope';

const PACKAGE_ID = createPackageId('pkg-1');
const OTHER_PACKAGE_ID = createPackageId('pkg-2');

function landing(installKey: string): PackageDestination {
  return {
    key: `r:${installKey}`,
    kind: 'repository',
    name: 'acme/one',
    details: ['main'],
    state: 'behind',
    behindArtifacts: [],
    behindCount: 1,
    hasWorkToSend: true,
    installKey,
    prUrl: null,
    lastActivityAt: null,
    hasStaleReport: false,
  };
}

function catalog(id: string): PackageDestination {
  return {
    key: `m:${id}`,
    kind: 'marketplace',
    name: 'Acme catalog',
    details: [],
    state: 'behind',
    behindArtifacts: [],
    behindCount: 0,
    hasWorkToSend: true,
    installKey: null,
    prUrl: null,
    lastActivityAt: null,
    hasStaleReport: false,
  };
}

function marketplace(
  id: string,
  packageIds: readonly string[] = [PACKAGE_ID],
): MarketplaceDrift {
  return {
    id: createMarketplaceId(id),
    name: 'Acme catalog',
    plugins: packageIds.map((packageId, index) => ({
      pluginSlug: `plugin-${index}`,
      packageId: createPackageId(packageId),
      packageName: `Package ${index}`,
      lastStatus: null,
      prUrl: null,
    })),
    publishedPackageNames: [],
  };
}

describe('buildPackageSyncScope', () => {
  describe('when nothing was picked', () => {
    it('returns null', () => {
      expect(buildPackageSyncScope([], PACKAGE_ID, [])).toBeNull();
    });
  });

  describe('when only landings were picked', () => {
    it('keeps the narrow package scope', () => {
      const scope = buildPackageSyncScope(
        [landing('repo-1::target-1'), landing('repo-2::target-1')],
        PACKAGE_ID,
        [marketplace('mkt-1')],
      );

      expect(scope).toEqual({
        kind: 'package',
        packageId: PACKAGE_ID,
        installKeys: ['repo-1::target-1', 'repo-2::target-1'],
      });
    });
  });

  describe('when a catalog is in the pick', () => {
    it('widens to a batch carrying both halves', () => {
      const drift = marketplace('mkt-1');

      const scope = buildPackageSyncScope(
        [landing('repo-1::target-1'), catalog('mkt-1')],
        PACKAGE_ID,
        [drift],
      );

      expect(scope).toEqual({
        kind: 'bulk',
        packageIds: [PACKAGE_ID],
        installKeyFilter: new Set(['repo-1::target-1']),
        marketplaces: [{ marketplace: drift, plugins: drift.plugins }],
      });
    });

    /*
     * The tab is about one package and the drift is read across the space, so
     * a catalog holding someone else's outdated plugins must not carry them
     * along.
     */
    it('sends only this package plugins', () => {
      const drift = marketplace('mkt-1', [PACKAGE_ID, OTHER_PACKAGE_ID]);

      const scope = buildPackageSyncScope([catalog('mkt-1')], PACKAGE_ID, [
        drift,
      ]);

      expect(scope).toEqual({
        kind: 'bulk',
        packageIds: [],
        installKeyFilter: new Set(),
        marketplaces: [
          {
            marketplace: drift,
            plugins: [drift.plugins[0]],
          },
        ],
      });
    });

    it('drops a catalog holding nothing of this package', () => {
      const scope = buildPackageSyncScope([catalog('mkt-1')], PACKAGE_ID, [
        marketplace('mkt-1', [OTHER_PACKAGE_ID]),
      ]);

      expect(scope).toBeNull();
    });

    it('drops a catalog the space drift does not know', () => {
      const scope = buildPackageSyncScope(
        [landing('repo-1::target-1'), catalog('mkt-unknown')],
        PACKAGE_ID,
        [marketplace('mkt-1')],
      );

      expect(scope).toEqual({
        kind: 'package',
        packageId: PACKAGE_ID,
        installKeys: ['repo-1::target-1'],
      });
    });
  });
});
