import { useMemo, useState } from 'react';
import { LuPlus, LuSearch, LuX } from 'react-icons/lu';
import {
  PMBox,
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMHStack,
  PMHeading,
  PMIcon,
  PMInput,
  PMInputGroup,
  PMLink,
  PMPortal,
  PMSeparator,
  PMSkeleton,
  PMText,
  PMTooltip,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import {
  OrganizationId,
  PackageResponse,
  CommandId,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { Link as RouterLink } from 'react-router';
import { routes } from '../../../../shared/utils/routes';
import {
  AddArtefactsToPackagesEntry,
  useAddArtefactsToPackagesMutation,
  useRemoveArtefactsFromPackageMutation,
} from '../../api/queries/DeploymentsQueries';
import { usePackageMembership } from '../../hooks/usePackageMembership';
import { usePackageDeploymentStatus } from '../../hooks/usePackageDeploymentStatus';
import { RemoveArtifactFromPackageConfirm } from '../PackagesPopover';

export type AddToPackagesArtifactKind = 'standard' | 'command' | 'skill';

type ArtifactType = 'standard' | 'recipe' | 'skill';
type ArtifactId = StandardId | CommandId | SkillId;

export interface ManagePackagesArtifact {
  id: ArtifactId;
  name: string;
}

interface AddToPackagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifacts: ManagePackagesArtifact[];
  artifactType: ArtifactType;
  artifactKindLabel: AddToPackagesArtifactKind;
  organizationId: OrganizationId;
  spaceId: SpaceId;
  orgSlug?: string;
  spaceSlug?: string;
  onSuccess: () => void;
}

const ARTIFACT_KIND_PLURALS: Record<AddToPackagesArtifactKind, string> = {
  standard: 'standards',
  command: 'commands',
  skill: 'skills',
};

function buildArtefactIdsPayload(
  artifactType: ArtifactType,
  ids: ArtifactId[],
): Pick<
  AddArtefactsToPackagesEntry,
  'standardIds' | 'commandIds' | 'skillIds'
> {
  switch (artifactType) {
    case 'standard':
      return { standardIds: ids as StandardId[] };
    case 'recipe':
      return { commandIds: ids as CommandId[] };
    case 'skill':
      return { skillIds: ids as SkillId[] };
  }
}

const byName = (a: PackageResponse, b: PackageResponse) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/**
 * Drawer-sized twin of the breadcrumb PackagesPopover for a list selection:
 * every package holding at least one selected artifact is removable in place
 * (removal only detaches the ones it holds), every package missing some is
 * one click away from adding them, so a partial overlap shows in both
 * sections. Adds are instant and silent (the row moves up into the members
 * section); removal confirms only when the package is deployed somewhere.
 */
export const AddToPackagesDialog = ({
  open,
  onOpenChange,
  artifacts,
  artifactType,
  artifactKindLabel,
  organizationId,
  spaceId,
  orgSlug,
  spaceSlug,
  onSuccess,
}: AddToPackagesDialogProps) => {
  const [query, setQuery] = useState('');
  const [removeTarget, setRemoveTarget] = useState<PackageResponse | null>(
    null,
  );
  const [hasChanged, setHasChanged] = useState(false);

  const artifactIds = useMemo(() => artifacts.map((a) => a.id), [artifacts]);
  const artifactCount = artifacts.length;
  const kindSingular = artifactKindLabel;
  const kindPlural = ARTIFACT_KIND_PLURALS[artifactKindLabel];

  const {
    addablePackages,
    memberPackages,
    presentArtifactIdsByPackageId,
    totalPackages,
    isLoading,
    isError,
  } = usePackageMembership({
    artifactIds,
    artifactType,
    spaceId,
    organizationId,
  });
  const { getDeployedTargets } = usePackageDeploymentStatus(spaceId);

  const { mutateAsync: addArtefacts, isPending: isAdding } =
    useAddArtefactsToPackagesMutation();
  const { mutateAsync: removeArtefacts, isPending: isRemoving } =
    useRemoveArtefactsFromPackageMutation();
  const isBusy = isAdding || isRemoving;

  const sortedMembers = useMemo(
    () => [...memberPackages].sort(byName),
    [memberPackages],
  );

  const filteredAddable = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const base = trimmed
      ? addablePackages.filter((pkg) =>
          pkg.name.toLowerCase().includes(trimmed),
        )
      : addablePackages;
    return [...base].sort(byName);
  }, [addablePackages, query]);

  const handleOpenChange = (details: { open: boolean }) => {
    onOpenChange(details.open);
    if (!details.open) {
      if (hasChanged) onSuccess();
      setQuery('');
      setRemoveTarget(null);
      setHasChanged(false);
    }
  };

  const handleAdd = async (pkg: PackageResponse) => {
    const presentSet =
      presentArtifactIdsByPackageId[pkg.id.toString()] ?? new Set<string>();
    const remaining = artifactIds.filter(
      (id) => !presentSet.has(id.toString()),
    );
    try {
      const outcomes = await addArtefacts({
        spaceId,
        entries: [
          {
            packageId: pkg.id,
            ...buildArtefactIdsPayload(artifactType, remaining),
          },
        ],
      });
      if (outcomes.some((o) => !o.ok)) {
        pmToaster.create({
          type: 'error',
          title: `Couldn't add to ${pkg.name}`,
          description: 'Try again, or check your space access.',
        });
        return;
      }
      setHasChanged(true);
    } catch {
      pmToaster.create({
        type: 'error',
        title: `Couldn't add to ${pkg.name}`,
        description: 'Try again, or check your space access.',
      });
    }
  };

  // The slice of the selection a package actually holds: what its × removes,
  // what the confirmation lists, and what the row hint counts.
  const presentArtifactsIn = (pkg: PackageResponse): ManagePackagesArtifact[] =>
    artifacts.filter((a) =>
      presentArtifactIdsByPackageId[pkg.id.toString()]?.has(a.id.toString()),
    );

  const removeFromPackage = async (pkg: PackageResponse) => {
    const presentIds = presentArtifactsIn(pkg).map((a) => a.id);
    try {
      await removeArtefacts({
        spaceId,
        packageId: pkg.id,
        ...buildArtefactIdsPayload(artifactType, presentIds),
      });
      setHasChanged(true);
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

  const removalNames = removeTarget
    ? presentArtifactsIn(removeTarget).map((a) => a.name)
    : [];

  const subtitle =
    artifactCount === 1
      ? `Which packages ship this ${kindSingular}.`
      : `Which packages ship these ${artifactCount} ${kindPlural}.`;

  const membersEmptyCopy =
    artifactCount === 1
      ? 'Not in any package yet. Pick one below to add it.'
      : `None of these ${artifactCount} ${kindPlural} are in a package yet. Pick one below to add them.`;

  const allCoveredCopy =
    artifactCount === 1
      ? `This ${kindSingular} is already in every package in this space.`
      : `These ${artifactCount} ${kindPlural} are already in every package in this space.`;

  const renderBody = () => {
    if (isLoading) {
      return (
        <PMVStack gap={2} alignItems="stretch">
          <PMSkeleton height="48px" />
          <PMSkeleton height="48px" />
          <PMSkeleton height="48px" />
        </PMVStack>
      );
    }

    if (isError) {
      return (
        <PMVStack gap={1} alignItems="stretch" paddingY={6} paddingX={2}>
          <PMText variant="body" color="error">
            Could not load packages.
          </PMText>
          <PMText variant="small" color="faded">
            Close this and try again.
          </PMText>
        </PMVStack>
      );
    }

    if (totalPackages === 0) {
      return (
        <PMVStack gap={2} alignItems="flex-start" paddingY={6} paddingX={2}>
          <PMText variant="body">No packages in this space yet.</PMText>
          {orgSlug && spaceSlug ? (
            <PMLink asChild variant="underline" fontSize="sm">
              <RouterLink to={routes.space.toCreatePackage(orgSlug, spaceSlug)}>
                Create one
              </RouterLink>
            </PMLink>
          ) : null}
        </PMVStack>
      );
    }

    return (
      <PMVStack gap={4} alignItems="stretch">
        <PMVStack gap={1} alignItems="stretch">
          <SectionLabel>In these packages</SectionLabel>
          {sortedMembers.length === 0 ? (
            <PMText variant="small" color="faded">
              {membersEmptyCopy}
            </PMText>
          ) : (
            <PMVStack gap={0} alignItems="stretch">
              {sortedMembers.map((pkg) => {
                const held = presentArtifactsIn(pkg);
                return (
                  <MemberRow
                    key={pkg.id}
                    pkg={pkg}
                    deployedTargets={getDeployedTargets(pkg.id)}
                    heldNames={
                      artifactCount > 1 && held.length < artifactCount
                        ? held.map((a) => a.name)
                        : null
                    }
                    totalCount={artifactCount}
                    disabled={isBusy}
                    onRemove={() => requestRemove(pkg)}
                  />
                );
              })}
            </PMVStack>
          )}
        </PMVStack>

        <PMSeparator />

        <PMVStack gap={2} alignItems="stretch">
          <SectionLabel>Add to a package</SectionLabel>
          {addablePackages.length === 0 ? (
            <PMText variant="small" color="faded">
              {allCoveredCopy}
            </PMText>
          ) : (
            <>
              <PMInputGroup startElement={<LuSearch />}>
                <PMInput
                  size="sm"
                  placeholder="Search packages..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search packages"
                />
              </PMInputGroup>
              {filteredAddable.length === 0 ? (
                <PMVStack gap={2} alignItems="flex-start" paddingY={2}>
                  <PMText variant="small" color="faded">
                    No package matches "{query}".
                  </PMText>
                  <PMLink
                    variant="underline"
                    fontSize="sm"
                    cursor="pointer"
                    onClick={() => setQuery('')}
                  >
                    Clear search
                  </PMLink>
                </PMVStack>
              ) : (
                <PMVStack gap={0} alignItems="stretch">
                  {filteredAddable.map((pkg) => {
                    const held = presentArtifactsIn(pkg);
                    const missing = artifacts.filter((a) => !held.includes(a));
                    return (
                      <AddRow
                        key={pkg.id}
                        pkg={pkg}
                        deployedTargets={getDeployedTargets(pkg.id)}
                        missingNames={
                          artifactCount > 1 && held.length > 0
                            ? missing.map((a) => a.name)
                            : null
                        }
                        totalCount={artifactCount}
                        disabled={isBusy}
                        onAdd={() => handleAdd(pkg)}
                      />
                    );
                  })}
                </PMVStack>
              )}
            </>
          )}
        </PMVStack>
      </PMVStack>
    );
  };

  return (
    <>
      <PMDrawer.Root
        closeOnInteractOutside={!isBusy}
        open={open}
        onOpenChange={handleOpenChange}
        placement="end"
        size="md"
      >
        <PMPortal>
          <PMDrawer.Backdrop />
          <PMDrawer.Positioner>
            <PMDrawer.Content>
              <PMDrawer.Header
                borderBottom="1px solid"
                borderColor="border.tertiary"
              >
                <PMVStack alignItems="flex-start" gap={1} flex={1}>
                  <PMHeading size="md">Manage packages</PMHeading>
                  <PMText variant="small" color="secondary">
                    {subtitle}
                  </PMText>
                </PMVStack>
                <PMDrawer.CloseTrigger asChild>
                  <PMCloseButton size="sm" disabled={isBusy} />
                </PMDrawer.CloseTrigger>
              </PMDrawer.Header>
              <PMDrawer.Body padding={5}>{renderBody()}</PMDrawer.Body>
              <PMBox
                borderTop="1px solid"
                borderColor="border.tertiary"
                paddingX={5}
                paddingY={3}
              >
                <PMHStack justify="flex-end">
                  <PMButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenChange({ open: false })}
                    disabled={isBusy}
                  >
                    Done
                  </PMButton>
                </PMHStack>
              </PMBox>
            </PMDrawer.Content>
          </PMDrawer.Positioner>
        </PMPortal>
      </PMDrawer.Root>

      <RemoveArtifactFromPackageConfirm
        open={removeTarget !== null}
        onOpenChange={(o) => {
          if (!o) setRemoveTarget(null);
        }}
        packageName={removeTarget?.name ?? ''}
        deployedTargets={removeTarget ? getDeployedTargets(removeTarget.id) : 0}
        artifactNames={removalNames}
        onConfirm={async () => {
          if (!removeTarget) return;
          await removeFromPackage(removeTarget);
          pmToaster.create({
            type: 'success',
            title:
              removalNames.length === 1
                ? 'Removed from package'
                : `${removalNames.length} ${kindPlural} removed from package`,
            description: `No longer bundled in ${removeTarget.name}.`,
          });
          setRemoveTarget(null);
        }}
      />
    </>
  );
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <PMText
      variant="small"
      fontWeight={600}
      color="faded"
      textTransform="uppercase"
      letterSpacing="0.04em"
    >
      {children}
    </PMText>
  );
}

function PackageRowContent({
  pkg,
  deployedTargets,
}: {
  pkg: PackageResponse;
  deployedTargets: number;
}) {
  return (
    <PMVStack alignItems="stretch" gap={0} flex={1} minWidth={0}>
      <PMHStack gap={2} alignItems="center" minWidth={0}>
        <PMText variant="body" fontWeight={500} truncate title={pkg.name}>
          {pkg.name}
        </PMText>
        {deployedTargets > 0 ? (
          <PMText variant="small" color="faded" flexShrink={0}>
            {deployedTargets} {deployedTargets === 1 ? 'repo' : 'repos'}
          </PMText>
        ) : null}
      </PMHStack>
      {pkg.description ? (
        <PMText variant="small" color="faded" truncate>
          {pkg.description}
        </PMText>
      ) : null}
    </PMVStack>
  );
}

function MemberRow({
  pkg,
  deployedTargets,
  heldNames,
  totalCount,
  disabled,
  onRemove,
}: {
  pkg: PackageResponse;
  deployedTargets: number;
  heldNames: string[] | null;
  totalCount: number;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <PMHStack
      gap={3}
      alignItems="center"
      paddingX={2}
      paddingY={2}
      borderRadius="sm"
      transition="background-color 120ms ease-out"
      _hover={{ backgroundColor: 'background.tertiary' }}
    >
      <PackageRowContent pkg={pkg} deployedTargets={deployedTargets} />
      {heldNames !== null ? (
        <PMTooltip label={heldNames.join(', ')} openDelay={300}>
          <PMBox as="span" flexShrink={0} cursor="help">
            <PMText variant="small" color="faded">
              contains {heldNames.length} of {totalCount}
            </PMText>
          </PMBox>
        </PMTooltip>
      ) : null}
      <PMBox
        as="button"
        flexShrink={0}
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        width="22px"
        height="22px"
        borderRadius="sm"
        color="text.secondary"
        cursor={disabled ? 'not-allowed' : 'pointer'}
        opacity={disabled ? 0.5 : 1}
        pointerEvents={disabled ? 'none' : undefined}
        transition="background-color 120ms ease-out, color 120ms ease-out"
        _hover={{ backgroundColor: 'background.primary', color: 'red.400' }}
        aria-label={`Remove from ${pkg.name}`}
        aria-disabled={disabled}
        onClick={disabled ? undefined : onRemove}
      >
        <PMIcon fontSize="xs">
          <LuX />
        </PMIcon>
      </PMBox>
    </PMHStack>
  );
}

function AddRow({
  pkg,
  deployedTargets,
  missingNames,
  totalCount,
  disabled,
  onAdd,
}: {
  pkg: PackageResponse;
  deployedTargets: number;
  missingNames: string[] | null;
  totalCount: number;
  disabled: boolean;
  onAdd: () => void;
}) {
  return (
    <PMHStack
      as="button"
      gap={3}
      alignItems="center"
      width="100%"
      textAlign="left"
      paddingX={2}
      paddingY={2}
      borderRadius="sm"
      cursor={disabled ? 'not-allowed' : 'pointer'}
      opacity={disabled ? 0.5 : 1}
      pointerEvents={disabled ? 'none' : undefined}
      transition="background-color 120ms ease-out"
      _hover={{ backgroundColor: 'background.tertiary' }}
      aria-label={`Add to ${pkg.name}`}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onAdd}
    >
      <PackageRowContent pkg={pkg} deployedTargets={deployedTargets} />
      {missingNames !== null ? (
        <PMTooltip label={missingNames.join(', ')} openDelay={300}>
          <PMBox as="span" flexShrink={0} cursor="help">
            <PMText variant="small" color="faded">
              adds {missingNames.length} of {totalCount}
            </PMText>
          </PMBox>
        </PMTooltip>
      ) : null}
      <PMBox flexShrink={0} color="text.faded">
        <PMIcon fontSize="sm">
          <LuPlus />
        </PMIcon>
      </PMBox>
    </PMHStack>
  );
}
