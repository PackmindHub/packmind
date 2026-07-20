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

interface UsePackageMembershipParams {
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

/**
 * Splits a space's packages by how they overlap a selection of artifacts:
 * `memberPackages` hold at least one of them (so something can be removed),
 * `addablePackages` miss at least one (so something can be added). A partial
 * overlap appears in both lists. `presentArtifactIdsByPackageId` exposes the
 * exact overlap so callers can scope row hints and mutation payloads to it.
 */
export function usePackageMembership({
  artifactIds,
  artifactType,
  spaceId,
  organizationId,
}: UsePackageMembershipParams) {
  const {
    data: packagesResponse,
    isLoading,
    isError,
  } = useListPackagesBySpaceQuery(spaceId, organizationId);

  const {
    addablePackages,
    memberPackages,
    presentArtifactIdsByPackageId,
    totalPackages,
  } = useMemo(() => {
    const allPackages = packagesResponse?.packages ?? [];
    const presentArtifactIdsByPackageId: Record<string, Set<string>> = {};
    const addable: PackageResponse[] = [];
    const members: PackageResponse[] = [];

    if (artifactIds.length === 0) {
      return {
        addablePackages: addable,
        memberPackages: members,
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
      if (present.size > 0) {
        members.push(pkg);
      }
    }

    return {
      addablePackages: addable,
      memberPackages: members,
      presentArtifactIdsByPackageId,
      totalPackages: allPackages.length,
    };
  }, [packagesResponse, artifactIds, artifactType]);

  return {
    addablePackages,
    memberPackages,
    presentArtifactIdsByPackageId,
    totalPackages,
    isLoading,
    isError,
  };
}
