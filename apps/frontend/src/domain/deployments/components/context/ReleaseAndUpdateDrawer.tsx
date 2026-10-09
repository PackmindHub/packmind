import type {
  GitProviderId,
  OrganizationId,
  PackageReleaseReadiness,
  PackageResponse,
} from '@packmind/types';
import type {
  MarketplaceDistributionResult,
  MarketplaceSyncTarget,
  SyncScope,
} from '../redesign/components/SyncSurface';
import type { PackageDrift } from '../redesign/types';
import { PackageReleaseVersionField } from './PackageReleaseVersionField';
import { SyncSurfaceDrawer } from './SyncSurfaceDrawer';
import { usePackageReleaseVersion } from './usePackageReleaseVersion';

const VERSION_FIELD_ID = 'release-and-update-version';

/**
 * Cuts a release and sends it to the picked destinations, behind one button.
 *
 * The version form on top of the same review `Update` opens, rather than the
 * release drawer followed by that review: the reader sees where the cut is
 * going before it exists, and there is no moment between the two where closing
 * a drawer leaves a release cut and sent nowhere.
 */
export function ReleaseAndUpdateDrawer({
  pkg,
  packages,
  scope,
  organizationId,
  readiness,
  providersWithToken,
  isProvidersLoading,
  onDistributeMarketplaces,
  open,
  onClose,
}: Readonly<{
  pkg: PackageResponse;
  packages: PackageDrift[];
  /** What the picked rows build into. Null until the first opening. */
  scope: SyncScope | null;
  organizationId: OrganizationId;
  readiness: PackageReleaseReadiness;
  providersWithToken: Set<GitProviderId>;
  isProvidersLoading: boolean;
  onDistributeMarketplaces?: (
    picks: MarketplaceSyncTarget[],
  ) => Promise<MarketplaceDistributionResult>;
  open: boolean;
  onClose: () => void;
}>) {
  const release = usePackageReleaseVersion({
    packageId: pkg.id,
    spaceId: pkg.spaceId,
    organizationId,
    readiness,
    componentsCount:
      pkg.recipes.length + pkg.standards.length + pkg.skills.length,
    open,
  });

  return (
    <SyncSurfaceDrawer
      open={open}
      onClose={onClose}
      packages={packages}
      scope={scope}
      providersWithToken={providersWithToken}
      isProvidersLoading={isProvidersLoading}
      onDistributeMarketplaces={onDistributeMarketplaces}
      release={{
        version: release.version,
        renderField: (locked) => (
          <PackageReleaseVersionField
            id={VERSION_FIELD_ID}
            release={release}
            disabled={locked || release.isPending}
          />
        ),
        cut: async () => (await release.release()) !== null,
      }}
    />
  );
}
