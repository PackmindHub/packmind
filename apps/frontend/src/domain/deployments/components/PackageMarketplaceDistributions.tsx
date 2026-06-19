import { useMemo } from 'react';
import {
  PMBox,
  PMEmptyState,
  PMHeading,
  PMHStack,
  PMSpinner,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  DistributionStatus,
  type MarketplaceListItem,
  type OrganizationId,
  type PackageId,
} from '@packmind/types';
import {
  useMarketplaceDistributions,
  useMarketplaces,
  useMarkPluginForRemovalByPackage,
} from '../../marketplaces/api/queries';
import {
  DistributionStatusBadge,
  RemovePluginButton,
} from '../../marketplaces/components';

export interface PackageMarketplaceDistributionsProps {
  organizationId: OrganizationId | string;
  packageId: PackageId;
}

/**
 * Lists the marketplaces this Packmind package is currently published to and
 * offers a per-marketplace "Remove" affordance backed by
 * `useMarkPluginForRemovalByPackage`.
 *
 * Renders nothing-ish when the package has no marketplace distributions so it
 * can be embedded directly on the package details page without forcing layout
 * decisions on the caller.
 */
export const PackageMarketplaceDistributions = ({
  organizationId,
  packageId,
}: Readonly<PackageMarketplaceDistributionsProps>) => {
  const { data: marketplaces, isLoading } = useMarketplaces(organizationId);

  if (isLoading) {
    return (
      <PMEmptyState
        icon={<PMSpinner />}
        title="Loading marketplaces"
        description="Checking which marketplaces this package is published to."
      />
    );
  }

  const items = marketplaces ?? [];

  if (items.length === 0) {
    return (
      <PMEmptyState
        title="Not published to any marketplace"
        description="This package has not been published to a marketplace yet."
      />
    );
  }

  return (
    <PMVStack align="stretch" gap={3}>
      <PMHeading size="md">Marketplace distributions</PMHeading>
      {items.map((marketplace) => (
        <PackageMarketplaceRow
          key={marketplace.id}
          marketplace={marketplace}
          organizationId={organizationId}
          packageId={packageId}
        />
      ))}
    </PMVStack>
  );
};

interface PackageMarketplaceRowProps {
  marketplace: MarketplaceListItem;
  organizationId: OrganizationId | string;
  packageId: PackageId;
}

const PackageMarketplaceRow = ({
  marketplace,
  organizationId,
  packageId,
}: PackageMarketplaceRowProps) => {
  const { data: distributions } = useMarketplaceDistributions(
    organizationId,
    marketplace.id,
  );
  const markMutation = useMarkPluginForRemovalByPackage(
    organizationId,
    marketplace.id,
  );

  const relevantDistribution = useMemo(
    () =>
      distributions?.find(
        (d) =>
          d.packageId === packageId &&
          (d.status === DistributionStatus.success ||
            d.status === DistributionStatus.pending_merge ||
            d.status === DistributionStatus.to_be_removed),
      ),
    [distributions, packageId],
  );

  if (!relevantDistribution) {
    return null;
  }

  return (
    <PMBox
      borderWidth="1px"
      borderRadius="md"
      p={3}
      data-testid={`package-marketplace-row-${marketplace.id}`}
    >
      <PMHStack justify="space-between" align="center" gap={4}>
        <PMVStack align="start" gap={0}>
          <PMText variant="body-important">{marketplace.name}</PMText>
          <PMText variant="small" color="faded">
            {relevantDistribution.pluginSlug}
          </PMText>
        </PMVStack>
        <PMHStack gap={3} align="center">
          <DistributionStatusBadge status={relevantDistribution.status} />
          {(relevantDistribution.status === DistributionStatus.success ||
            relevantDistribution.status ===
              DistributionStatus.pending_merge) && (
            <RemovePluginButton
              pluginSlug={relevantDistribution.pluginSlug}
              marketplaceName={marketplace.name}
              onMark={() => markMutation.mutate(packageId)}
              isMarking={markMutation.isPending}
            />
          )}
        </PMHStack>
      </PMHStack>
    </PMBox>
  );
};
