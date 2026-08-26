import { useMemo, useState } from 'react';
import { PMBox, PMHStack, PMSpinner, PMText, PMVStack } from '@packmind/ui';
import type { GitProviderId, PackageResponse } from '@packmind/types';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';
import { DeployPackageButton } from '../PackageDeployments/DeployPackageButton';
import { PackageDetailPane } from '../redesign/components/PackageDetailPane';
import {
  SyncSurface,
  type SyncScope,
} from '../redesign/components/SyncSurface';
import { providersWithTokenSet } from '../redesign/selectors/providerAuth';
import type { PackageDrift } from '../redesign/types';

/**
 * The other half of a package: not what it holds, but where it landed and what
 * is stale there.
 *
 * It reuses the drift pane built for the Distribution surface rather than
 * showing a lighter summary here. Two readings of the same state, one per
 * screen, is how a package ends up looking up to date in one place and behind in
 * the other; and the answer to "this is behind" has to be the redistribute
 * gesture, which only that pane carries.
 */
export function ContextPackageDistribution({
  pkg,
  drift,
  packages,
  isLoading,
  isError,
  distributionHistoryHref,
}: Readonly<{
  pkg: PackageResponse;
  /** Null when the package has never been distributed anywhere. */
  drift: PackageDrift | null;
  /** Every package of the space: the redistribute flow reads across them. */
  packages: PackageDrift[];
  isLoading: boolean;
  isError: boolean;
  /** The package's own page, where the distribution events are listed. */
  distributionHistoryHref: string;
}>) {
  const { data: providersResponse, isLoading: isProvidersLoading } =
    useGetGitProvidersQuery();
  const providersWithToken = useMemo<Set<GitProviderId>>(
    () => providersWithTokenSet(providersResponse),
    [providersResponse],
  );

  const [syncScope, setSyncScope] = useState<SyncScope | null>(null);

  /*
   * The redistribute flow takes over the pane and leaves the rail alone: the
   * package it is about is named in the header just above, and cancelling has to
   * come back to the same place it started from.
   */
  if (syncScope !== null) {
    return (
      <PMBox flex="1" minH={0} overflowY="auto" padding={6}>
        <SyncSurface
          packages={packages}
          scope={syncScope}
          providersWithToken={providersWithToken}
          isProvidersLoading={isProvidersLoading}
          onCancel={() => setSyncScope(null)}
          onConfirm={() => setSyncScope(null)}
        />
      </PMBox>
    );
  }

  if (isLoading) {
    return (
      <PMHStack flex="1" minH={0} justify="center" align="center" gap={2}>
        <PMSpinner />
        <PMText color="secondary">Loading distributions...</PMText>
      </PMHStack>
    );
  }

  if (isError) {
    return (
      <PMBox flex="1" minH={0} padding={6}>
        <PMText color="error">Error loading distributions.</PMText>
      </PMBox>
    );
  }

  if (!drift) {
    return (
      <PMBox flex="1" minH={0} overflowY="auto" padding={6}>
        <NeverDistributed pkg={pkg} />
      </PMBox>
    );
  }

  return (
    <PMBox flex="1" minH={0}>
      <PackageDetailPane
        pkg={drift}
        hideIdentityHeader
        providersWithToken={providersWithToken}
        isProvidersLoading={isProvidersLoading}
        onSyncPackage={(packageId, installKeys) =>
          setSyncScope({ kind: 'package', packageId, installKeys })
        }
        distributionHistoryHref={distributionHistoryHref}
      />
    </PMBox>
  );
}

/**
 * A package that exists but has never been pushed anywhere. It says what that
 * costs rather than reporting an absence of rows: the package is readable here
 * and by nothing else.
 */
function NeverDistributed({ pkg }: Readonly<{ pkg: PackageResponse }>) {
  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      padding={6}
      maxWidth="68ch"
    >
      <PMVStack align="start" gap={1}>
        <PMText fontWeight="medium">This package is nowhere yet.</PMText>
        <PMText color="secondary">
          It has never been distributed, so nothing reads it outside Packmind.
          Distributing it writes its components into a repository, where the
          agents working there pick them up.
        </PMText>
        <PMBox paddingTop={3}>
          <DeployPackageButton
            size="sm"
            selectedPackages={[pkg]}
            label="Distribute"
          />
        </PMBox>
      </PMVStack>
    </PMBox>
  );
}
