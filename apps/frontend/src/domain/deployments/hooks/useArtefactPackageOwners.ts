import { useMemo } from 'react';
import {
  OrganizationId,
  PackageId,
  PackageResponse,
  SpaceId,
} from '@packmind/types';
import { useListPackagesBySpaceQuery } from '../api/queries/DeploymentsQueries';

interface UseArtefactPackageOwnersParams {
  spaceId: SpaceId | undefined;
  organizationId: OrganizationId | undefined;
  /** The package being edited: what it holds is its own to keep or drop. */
  excludePackageId: PackageId;
}

/**
 * Names the package holding each component, keyed by component id, skipping
 * the one package the caller is editing.
 *
 * A component belongs to a single package, so this is what a package form
 * consults to know which components are already spoken for — and by whom, so
 * it can say so rather than just refusing. Legacy data may still have a
 * component in several packages; the name shown is then one of them.
 */
export function getOwnerByArtefactId(
  packages: PackageResponse[] | undefined,
  excludePackageId: PackageId,
): Record<string, string> {
  const owners: Record<string, string> = {};

  for (const pkg of packages ?? []) {
    if (pkg.id === excludePackageId) continue;

    const held = [
      ...(pkg.standards ?? []),
      ...(pkg.commands ?? []),
      ...(pkg.skills ?? []),
    ];
    for (const artefactId of held) {
      owners[artefactId.toString()] = pkg.name;
    }
  }

  return owners;
}

/** {@link getOwnerByArtefactId} over the space's packages. */
export function useArtefactPackageOwners({
  spaceId,
  organizationId,
  excludePackageId,
}: UseArtefactPackageOwnersParams) {
  const {
    data: packagesResponse,
    isLoading,
    isError,
  } = useListPackagesBySpaceQuery(spaceId, organizationId);

  const ownerByArtefactId = useMemo(
    () => getOwnerByArtefactId(packagesResponse?.packages, excludePackageId),
    [packagesResponse, excludePackageId],
  );

  return { ownerByArtefactId, isLoading, isError };
}
