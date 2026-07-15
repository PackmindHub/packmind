import { useMemo } from 'react';
import { useListPackagesBySpaceQuery } from '../api/queries/DeploymentsQueries';
import {
  OrganizationId,
  PackageResponse,
  CommandId,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';

type ArtifactType = 'standard' | 'recipe' | 'skill';
type ArtifactId = StandardId | CommandId | SkillId;

interface UsePackagesMissingAnyArtifactParams {
  artifactIds: ArtifactId[];
  artifactType: ArtifactType;
  spaceId: SpaceId | undefined;
  organizationId: OrganizationId | undefined;
}

function getOwnedArtifactIds(
  pkg: PackageResponse,
  artifactType: ArtifactType,
): readonly string[] {
  switch (artifactType) {
    case 'standard':
      return (pkg.standards ?? []).map((id) => id.toString());
    case 'recipe':
      return (pkg.commands ?? []).map((id) => id.toString());
    case 'skill':
      return (pkg.skills ?? []).map((id) => id.toString());
  }
}

export function usePackagesMissingAnyArtifact({
  artifactIds,
  artifactType,
  spaceId,
  organizationId,
}: UsePackagesMissingAnyArtifactParams) {
  const {
    data: packagesResponse,
    isLoading,
    isError,
  } = useListPackagesBySpaceQuery(spaceId, organizationId);

  const { addablePackages, presentArtifactIdsByPackageId, totalPackages } =
    useMemo(() => {
      const allPackages = packagesResponse?.packages ?? [];
      const presentArtifactIdsByPackageId: Record<string, Set<string>> = {};
      const addable: PackageResponse[] = [];

      if (artifactIds.length === 0) {
        return {
          addablePackages: addable,
          presentArtifactIdsByPackageId,
          totalPackages: allPackages.length,
        };
      }

      const wantedIds = new Set(artifactIds.map((id) => id.toString()));
      for (const pkg of allPackages) {
        const owned = getOwnedArtifactIds(pkg, artifactType);
        const present = new Set(owned.filter((id) => wantedIds.has(id)));
        presentArtifactIdsByPackageId[pkg.id.toString()] = present;
        if (present.size < artifactIds.length) {
          addable.push(pkg);
        }
      }

      return {
        addablePackages: addable,
        presentArtifactIdsByPackageId,
        totalPackages: allPackages.length,
      };
    }, [packagesResponse, artifactIds, artifactType]);

  return {
    addablePackages,
    presentArtifactIdsByPackageId,
    totalPackages,
    isLoading,
    isError,
  };
}
