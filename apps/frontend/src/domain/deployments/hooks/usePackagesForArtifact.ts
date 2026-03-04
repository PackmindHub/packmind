import { useMemo } from 'react';
import { useListPackagesBySpaceQuery } from '../api/queries/DeploymentsQueries';
import {
  OrganizationId,
  Package,
  RecipeId,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';

type ArtifactType = 'standard' | 'recipe' | 'skill';

interface UsePackagesForArtifactParams {
  artifactId: StandardId | RecipeId | SkillId | undefined;
  artifactType: ArtifactType;
  spaceId: SpaceId | undefined;
  organizationId: OrganizationId | undefined;
}

export function usePackagesForArtifact({
  artifactId,
  artifactType,
  spaceId,
  organizationId,
}: UsePackagesForArtifactParams) {
  const { data: packagesResponse, isLoading } = useListPackagesBySpaceQuery(
    spaceId,
    organizationId,
  );

  const packages = useMemo(() => {
    if (!packagesResponse?.packages || !artifactId) return [];

    return packagesResponse.packages.filter((pkg: Package) => {
      switch (artifactType) {
        case 'standard':
          return pkg.standards?.includes(artifactId as StandardId);
        case 'recipe':
          return pkg.recipes?.includes(artifactId as RecipeId);
        case 'skill':
          return pkg.skills?.includes(artifactId as SkillId);
      }
    });
  }, [packagesResponse, artifactId, artifactType]);

  return {
    packages,
    count: packages.length,
    isLoading,
  };
}
