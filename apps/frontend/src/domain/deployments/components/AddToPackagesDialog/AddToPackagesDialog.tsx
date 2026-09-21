import { useMemo, useState } from 'react';
import { LuArrowRight, LuSearch, LuX } from 'react-icons/lu';
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
  useMoveArtefactsToPackageMutation,
  useRemoveArtefactsFromPackageMutation,
} from '../../api/queries/DeploymentsQueries';
import { usePackageMembership } from '../../hooks/usePackageMembership';
import { usePackageDeploymentStatus } from '../../hooks/usePackageDeploymentStatus';
import {
  deployedPlaceParts,
  RemoveArtifactFromPackageConfirm,
} from '../PackagesPopover';
import { MoveArtifactsToPackageConfirm } from './MoveArtifactsToPackageConfirm';

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

type ArtefactIdsPayload = {
  standardIds?: StandardId[];
  commandIds?: CommandId[];
  skillIds?: SkillId[];
};

function buildArtefactIdsPayload(
  artifactType: ArtifactType,
  ids: ArtifactId[],
): ArtefactIdsPayload {
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
 * one click away from taking them, so a partial overlap shows in both
 * sections.
 *
 * An artifact belongs to a single package, so picking a package *moves* the
 * selection there: whatever another package held is taken out of it, in one
 * server-side move that either lands whole or not at all. Moves are instant
 * and silent (the row travels up into the members section); removal confirms
 * only when the package is deployed somewhere.
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
  const [moveTarget, setMoveTarget] = useState<PackageResponse | null>(null);
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
  const { getDeployedTargets, getDeployedMarketplaces, isDeployed } =
    usePackageDeploymentStatus(spaceId, organizationId);

  const { mutateAsync: moveArtefacts, isPending: isMoving } =
    useMoveArtefactsToPackageMutation();
  const { mutateAsync: removeArtefacts, isPending: isRemoving } =
    useRemoveArtefactsFromPackageMutation();
  const isBusy = isMoving || isRemoving;

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
      setMoveTarget(null);
      setHasChanged(false);
    }
  };

  // The whole selection is sent, already-present artifacts included: the
  // server skips those and still empties the packages holding the others.
  const moveToPackage = async (pkg: PackageResponse) => {
    try {
      await moveArtefacts({
        spaceId,
        packageId: pkg.id,
        ...buildArtefactIdsPayload(artifactType, artifactIds),
      });
      setHasChanged(true);
    } catch (error) {
      pmToaster.create({
        type: 'error',
        title: `Couldn't move to ${pkg.name}`,
        description: 'Nothing changed. Try again, or check your space access.',
      });
      throw error;
    }
  };

  // The slice of the selection a package actually holds: what its × removes,
  // what the confirmation lists, and what the row hint counts.
  const presentArtifactsIn = (pkg: PackageResponse): ManagePackagesArtifact[] =>
    artifacts.filter((a) =>
      presentArtifactIdsByPackageId[pkg.id.toString()]?.has(a.id.toString()),
    );

  /**
   * What clicking a package would do to the selection it does not already
   * hold: an artifact another package holds is relocated, an artifact no
   * package holds is simply added. The two are counted apart because only the
   * first one takes something away from somewhere else.
   */
  const splitByOutcome = (pkg: PackageResponse) => {
    const present = presentArtifactIdsByPackageId[pkg.id.toString()];
    const missing = artifacts.filter((a) => !present?.has(a.id.toString()));
    const heldElsewhere = (artifact: ManagePackagesArtifact) =>
      Object.entries(presentArtifactIdsByPackageId).some(
        ([otherPackageId, ids]) =>
          otherPackageId !== pkg.id.toString() &&
          ids.has(artifact.id.toString()),
      );

    return {
      moved: missing.filter(heldElsewhere),
      added: missing.filter((a) => !heldElsewhere(a)),
    };
  };

  /** The packages a move to `target` would take the selection out of. */
  const emptiedBy = (target: PackageResponse): PackageResponse[] =>
    sortedMembers.filter((pkg) => pkg.id !== target.id);

  /**
   * Only a package that is live somewhere earns a prompt: moving into a
   * distributed package adds to what it ships and needs no warning, while
   * moving out of one takes something away at the next sync.
   */
  const requestMove = (pkg: PackageResponse) => {
    if (emptiedBy(pkg).some((source) => isDeployed(source.id))) {
      setMoveTarget(pkg);
    } else {
      void moveToPackage(pkg).catch(() => {
        /* error surfaced via toast */
      });
    }
  };

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
    if (isDeployed(pkg.id)) {
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
      ? 'Not in any package yet. Pick one below.'
      : `None of these ${artifactCount} ${kindPlural} are in a package yet. Pick one below.`;

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
                    deployedMarketplaces={getDeployedMarketplaces(pkg.id)}
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
          <SectionLabel>Move to a package</SectionLabel>
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
                    const { moved, added } = splitByOutcome(pkg);
                    const holdsSome = presentArtifactsIn(pkg).length > 0;
                    return (
                      <MoveRow
                        key={pkg.id}
                        pkg={pkg}
                        deployedTargets={getDeployedTargets(pkg.id)}
                        deployedMarketplaces={getDeployedMarketplaces(pkg.id)}
                        movedNames={moved.map((a) => a.name)}
                        addedNames={added.map((a) => a.name)}
                        showAddedOnly={artifactCount > 1 && holdsSome}
                        disabled={isBusy}
                        onMove={() => requestMove(pkg)}
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
        deployedMarketplaces={
          removeTarget ? getDeployedMarketplaces(removeTarget.id) : 0
        }
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

      <MoveArtifactsToPackageConfirm
        open={moveTarget !== null}
        onOpenChange={(o) => {
          if (!o) setMoveTarget(null);
        }}
        targetPackageName={moveTarget?.name ?? ''}
        artifactNames={artifacts.map((a) => a.name)}
        emptiedPackages={(moveTarget ? emptiedBy(moveTarget) : []).map(
          (source) => ({
            packageName: source.name,
            deployedTargets: getDeployedTargets(source.id),
            deployedMarketplaces: getDeployedMarketplaces(source.id),
          }),
        )}
        onConfirm={async () => {
          if (!moveTarget) return;
          await moveToPackage(moveTarget);
          pmToaster.create({
            type: 'success',
            title:
              artifactCount === 1
                ? 'Moved to package'
                : `${artifactCount} ${kindPlural} moved to package`,
            description: `Now bundled in ${moveTarget.name} only.`,
          });
          setMoveTarget(null);
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
  deployedMarketplaces,
}: {
  pkg: PackageResponse;
  deployedTargets: number;
  deployedMarketplaces: number;
}) {
  const deployedPlaces = deployedPlaceParts(
    deployedTargets,
    deployedMarketplaces,
  ).join(' · ');
  return (
    <PMVStack alignItems="stretch" gap={0} flex={1} minWidth={0}>
      <PMHStack gap={2} alignItems="center" minWidth={0}>
        <PMText variant="body" fontWeight={500} truncate title={pkg.name}>
          {pkg.name}
        </PMText>
        {deployedPlaces ? (
          <PMText variant="small" color="faded" flexShrink={0}>
            {deployedPlaces}
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
  deployedMarketplaces,
  heldNames,
  totalCount,
  disabled,
  onRemove,
}: {
  pkg: PackageResponse;
  deployedTargets: number;
  deployedMarketplaces: number;
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
      <PackageRowContent
        pkg={pkg}
        deployedTargets={deployedTargets}
        deployedMarketplaces={deployedMarketplaces}
      />
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

/**
 * The row's hint answers "what happens if I click this?" — how many of the
 * selection travel here from another package, and how many are placed in one
 * for the first time. A count of zero is left out rather than printed as zero.
 *
 * A move always says so, however small: it is the part that takes something
 * away from somewhere else. Plain additions are only worth a hint when the
 * package already holds part of the selection (`showAddedOnly`), since
 * otherwise every row would repeat the selection count back at the user.
 */
function moveHint(
  movedNames: string[],
  addedNames: string[],
  showAddedOnly: boolean,
): { label: string; detail: string } | null {
  const moves = `Moves ${movedNames.length}`;
  const adds = `Adds ${addedNames.length}`;

  if (movedNames.length > 0 && addedNames.length > 0) {
    return {
      label: `${moves}, ${adds}`,
      detail: `Moves: ${movedNames.join(', ')} · Adds: ${addedNames.join(', ')}`,
    };
  }

  if (movedNames.length > 0) {
    return { label: moves, detail: movedNames.join(', ') };
  }

  if (addedNames.length > 0 && showAddedOnly) {
    return { label: adds, detail: addedNames.join(', ') };
  }

  return null;
}

function MoveRow({
  pkg,
  deployedTargets,
  deployedMarketplaces,
  movedNames,
  addedNames,
  showAddedOnly,
  disabled,
  onMove,
}: {
  pkg: PackageResponse;
  deployedTargets: number;
  deployedMarketplaces: number;
  movedNames: string[];
  addedNames: string[];
  showAddedOnly: boolean;
  disabled: boolean;
  onMove: () => void;
}) {
  const hint = moveHint(movedNames, addedNames, showAddedOnly);

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
      aria-label={`Move to ${pkg.name}`}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onMove}
    >
      <PackageRowContent
        pkg={pkg}
        deployedTargets={deployedTargets}
        deployedMarketplaces={deployedMarketplaces}
      />
      {hint ? (
        <PMTooltip label={hint.detail} openDelay={300}>
          <PMBox as="span" flexShrink={0} cursor="help">
            <PMText variant="small" color="faded">
              {hint.label}
            </PMText>
          </PMBox>
        </PMTooltip>
      ) : null}
      <PMBox flexShrink={0} color="text.faded">
        <PMIcon fontSize="sm">
          <LuArrowRight />
        </PMIcon>
      </PMBox>
    </PMHStack>
  );
}
