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

interface UsePackagesNotContainingArtifactParams {
  artifactId: StandardId | RecipeId | SkillId | undefined;
  artifactType: ArtifactType;
  spaceId: SpaceId | undefined;
  organizationId: OrganizationId | undefined;
}

function packageContainsArtifact(
  pkg: Package,
  artifactId: StandardId | RecipeId | SkillId,
  artifactType: ArtifactType,
): boolean {
  switch (artifactType) {
    case 'standard':
      return pkg.standards?.includes(artifactId as StandardId) ?? false;
    case 'recipe':
      return pkg.recipes?.includes(artifactId as RecipeId) ?? false;
    case 'skill':
      return pkg.skills?.includes(artifactId as SkillId) ?? false;
  }
}

export function usePackagesNotContainingArtifact({
  artifactId,
  artifactType,
  spaceId,
  organizationId,
}: UsePackagesNotContainingArtifactParams) {
  const {
    data: packagesResponse,
    isLoading,
    isError,
  } = useListPackagesBySpaceQuery(spaceId, organizationId);

  const { addablePackages, totalPackages } = useMemo(() => {
    const all = packagesResponse?.packages ?? [];
    if (!artifactId) {
      return { addablePackages: [] as Package[], totalPackages: all.length };
    }
    return {
      addablePackages: all.filter(
        (pkg) => !packageContainsArtifact(pkg, artifactId, artifactType),
      ),
      totalPackages: all.length,
    };
  }, [packagesResponse, artifactId, artifactType]);

  return {
    addablePackages,
    totalPackages,
    isLoading,
    isError,
  };
}
