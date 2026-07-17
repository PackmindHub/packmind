import { useState } from 'react';
import { LuX } from 'react-icons/lu';
import { PMBadge, PMBox, PMIcon, PMText, pmToaster } from '@packmind/ui';
import {
  OrganizationId,
  PackageResponse,
  CommandId,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import {
  useRemoveArtefactsFromPackageMutation,
  AddArtefactsToPackagesEntry,
} from '../../api/queries/DeploymentsQueries';
import { usePackagesForArtifact } from '../../hooks/usePackagesForArtifact';
import { usePackageDeploymentStatus } from '../../hooks/usePackageDeploymentStatus';
import { RemoveArtifactFromPackageConfirm } from '../PackagesPopover';

type ArtifactType = 'standard' | 'recipe' | 'skill';
type ArtifactId = StandardId | CommandId | SkillId;

interface MembershipChipsProps {
  artifactId: ArtifactId | undefined;
  artifactType: ArtifactType;
  artifactName: string;
  spaceId: SpaceId | undefined;
  organizationId: OrganizationId | undefined;
}

/**
 * Inline, removable package chips for an artifact row in a list. The × asks
 * for confirmation only when the package is live on a target (it keeps
 * shipping until the next sync); otherwise it removes right away.
 */
export const MembershipChips = ({
  artifactId,
  artifactType,
  artifactName,
  spaceId,
  organizationId,
}: MembershipChipsProps) => {
  const [removeTarget, setRemoveTarget] = useState<PackageResponse | null>(
    null,
  );
  const { packages, isLoading, isError } = usePackagesForArtifact({
    artifactId,
    artifactType,
    spaceId,
    organizationId,
  });
  const { getDeployedTargets } = usePackageDeploymentStatus(spaceId);
  const { mutateAsync: removeArtefacts } =
    useRemoveArtefactsFromPackageMutation();

  if (isLoading || isError) return null;

  if (packages.length === 0) {
    return <PMText data-testid="package-count-empty">{'—'}</PMText>;
  }

  const artifactIdsPayload = (): Pick<
    AddArtefactsToPackagesEntry,
    'standardIds' | 'commandIds' | 'skillIds'
  > => {
    switch (artifactType) {
      case 'standard':
        return { standardIds: [artifactId as StandardId] };
      case 'recipe':
        return { commandIds: [artifactId as CommandId] };
      case 'skill':
        return { skillIds: [artifactId as SkillId] };
    }
  };

  const removeFromPackage = async (pkg: PackageResponse) => {
    if (!spaceId) return;
    try {
      await removeArtefacts({
        spaceId,
        packageId: pkg.id,
        ...artifactIdsPayload(),
      });
    } catch (error) {
      pmToaster.create({
        type: 'error',
        title: `Couldn't remove from ${pkg.name}`,
        description: 'Try again, or check your space access.',
      });
      throw error;
    }
  };

  const requestRemove = (pkg: PackageResponse) => {
    // A deployed package keeps shipping until the next sync, so warn first.
    // An undeployed one has no consequence, so remove without a dialog.
    if (getDeployedTargets(pkg.id) > 0) {
      setRemoveTarget(pkg);
    } else {
      void removeFromPackage(pkg).catch(() => {
        /* error surfaced via toast */
      });
    }
  };

  return (
    <>
      <PMBox display="flex" flexWrap="wrap" gap={1}>
        {packages.map((pkg) => (
          <PMBadge key={pkg.id} variant="subtle" size="sm">
            <PMText variant="small" truncate maxWidth="160px" title={pkg.name}>
              {pkg.name}
            </PMText>
            <PMBox
              as="button"
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              marginLeft={1}
              color="text.secondary"
              cursor="pointer"
              _hover={{ color: 'red.400' }}
              aria-label={`Remove from ${pkg.name}`}
              onClick={() => requestRemove(pkg)}
            >
              <PMIcon fontSize="2xs">
                <LuX />
              </PMIcon>
            </PMBox>
          </PMBadge>
        ))}
      </PMBox>

      <RemoveArtifactFromPackageConfirm
        open={removeTarget !== null}
        onOpenChange={(o) => {
          if (!o) setRemoveTarget(null);
        }}
        packageName={removeTarget?.name ?? ''}
        deployedTargets={removeTarget ? getDeployedTargets(removeTarget.id) : 0}
        artifactNames={[artifactName]}
        onConfirm={async () => {
          if (!removeTarget) return;
          await removeFromPackage(removeTarget);
          pmToaster.create({
            type: 'success',
            title: 'Removed from package',
            description: `No longer bundled in ${removeTarget.name}.`,
          });
          setRemoveTarget(null);
        }}
      />
    </>
  );
};
