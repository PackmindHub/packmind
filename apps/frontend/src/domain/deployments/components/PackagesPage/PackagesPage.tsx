import React from 'react';
import {
  PMVStack,
  PMText,
  PMSpinner,
  PMBox,
  PMHStack,
  PMHeading,
} from '@packmind/ui';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useListPackagesBySpaceQuery } from '../../api/queries/DeploymentsQueries';

export interface PackagesPageProps {
  spaceSlug: string;
}

export const PackagesPage: React.FC<PackagesPageProps> = ({ spaceSlug }) => {
  const { spaceId, space, isLoading: isLoadingSpace } = useCurrentSpace();

  const organizationId = space?.organizationId;

  const {
    data: packagesResponse,
    isLoading: isLoadingPackages,
    error,
  } = useListPackagesBySpaceQuery(spaceId, organizationId);

  if (isLoadingSpace || isLoadingPackages) {
    return (
      <PMBox display="flex" justifyContent="center" alignItems="center" p={8}>
        <PMSpinner size="lg" />
      </PMBox>
    );
  }

  if (error) {
    return (
      <PMBox p={4}>
        <PMText color="error">Error loading packages: {String(error)}</PMText>
      </PMBox>
    );
  }

  const packages = packagesResponse?.packages || [];

  if (packages.length === 0) {
    return (
      <PMBox p={4}>
        <PMText colorPalette="gray">No packages found in this space.</PMText>
      </PMBox>
    );
  }

  return (
    <PMVStack align="stretch" gap={4}>
      {packages.map((pkg) => (
        <PMBox
          key={pkg.id}
          p={4}
          borderWidth="1px"
          borderRadius="md"
          borderColor="border.default"
        >
          <PMVStack align="stretch" gap={2}>
            <PMHStack justify="space-between">
              <PMHeading size="md">{pkg.name}</PMHeading>
              <PMText fontSize="sm" colorPalette="gray">
                {pkg.slug}
              </PMText>
            </PMHStack>
            <PMText>{pkg.description}</PMText>
            <PMHStack gap={4}>
              <PMText fontSize="sm" colorPalette="gray">
                {pkg.recipes?.length || 0} recipe(s)
              </PMText>
              <PMText fontSize="sm" colorPalette="gray">
                {pkg.standards?.length || 0} standard(s)
              </PMText>
            </PMHStack>
          </PMVStack>
        </PMBox>
      ))}
    </PMVStack>
  );
};
