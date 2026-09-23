import { useMemo, useState } from 'react';
import {
  LuArrowRight,
  LuChevronDown,
  LuPackagePlus,
  LuSearch,
  LuX,
} from 'react-icons/lu';
import {
  PMBox,
  PMHStack,
  PMIcon,
  PMInput,
  PMPopover,
  PMPortal,
  PMSeparator,
  PMSkeleton,
  PMText,
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
import {
  useListPackagesBySpaceQuery,
  useMoveArtefactsToPackageMutation,
  useRemoveArtefactsFromPackageMutation,
} from '../../api/queries/DeploymentsQueries';
import { getArtifactPackages } from '../../hooks/usePackagesForArtifact';
import { usePackageDeploymentStatus } from '../../hooks/usePackageDeploymentStatus';
import { MoveArtifactsToPackageConfirm } from './MoveArtifactsToPackageConfirm';
import { RemoveArtifactFromPackageConfirm } from './RemoveArtifactFromPackageConfirm';

type ArtifactType = 'standard' | 'recipe' | 'skill';
type ArtifactKindLabel = 'standard' | 'command' | 'skill';
type ArtifactId = StandardId | CommandId | SkillId;

interface PackagesPopoverProps {
  artifactId: ArtifactId | undefined;
  artifactType: ArtifactType;
  artifactKindLabel: ArtifactKindLabel;
  artifactName: string;
  spaceId: SpaceId | undefined;
  organizationId: OrganizationId | undefined;
}

const byName = (a: PackageResponse, b: PackageResponse) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/**
 * Interactive breadcrumb widget for managing an artifact's package membership
 * in place.
 *
 * An artifact belongs to a single package, so picking one *moves* it there and
 * out of wherever it was. Both directions are instant unless a package that
 * loses the artifact is deployed somewhere — that asks first, since it stops
 * shipping there. Replaces the read-only PackageCountHeaderInfo.
 */
export const PackagesPopover = ({
  artifactId,
  artifactType,
  artifactKindLabel,
  artifactName,
  spaceId,
  organizationId,
}: PackagesPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [removeTarget, setRemoveTarget] = useState<PackageResponse | null>(
    null,
  );
  const [moveTarget, setMoveTarget] = useState<PackageResponse | null>(null);

  const {
    data: packagesResponse,
    isLoading,
    isError,
  } = useListPackagesBySpaceQuery(spaceId, organizationId);
  const { getDeployedTargets, getDeployedMarketplaces, isDeployed } =
    usePackageDeploymentStatus(spaceId, organizationId);
  const { mutateAsync: moveArtefacts, isPending: isMoving } =
    useMoveArtefactsToPackageMutation();
  const { mutateAsync: removeArtefacts, isPending: isRemoving } =
    useRemoveArtefactsFromPackageMutation();

  const allPackages = useMemo(
    () => packagesResponse?.packages ?? [],
    [packagesResponse],
  );

  const members = useMemo(() => {
    if (!artifactId) return [];
    return [...getArtifactPackages(allPackages, artifactId, artifactType)].sort(
      byName,
    );
  }, [allPackages, artifactId, artifactType]);

  const addable = useMemo(() => {
    const memberIds = new Set(members.map((p) => p.id.toString()));
    return allPackages.filter((p) => !memberIds.has(p.id.toString()));
  }, [allPackages, members]);

  const filteredAddable = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? addable.filter((p) => p.name.toLowerCase().includes(q))
      : addable;
    return [...base].sort(byName);
  }, [addable, query]);

  if (!artifactId || !spaceId || !organizationId) return null;

  const noPackages = !isLoading && !isError && allPackages.length === 0;
  const isBusy = isMoving || isRemoving;

  const artifactIdsPayload = (): {
    standardIds?: StandardId[];
    commandIds?: CommandId[];
    skillIds?: SkillId[];
  } => {
    switch (artifactType) {
      case 'standard':
        return { standardIds: [artifactId as StandardId] };
      case 'recipe':
        return { commandIds: [artifactId as CommandId] };
      case 'skill':
        return { skillIds: [artifactId as SkillId] };
    }
  };

  const moveToPackage = async (pkg: PackageResponse) => {
    try {
      await moveArtefacts({
        spaceId,
        packageId: pkg.id,
        ...artifactIdsPayload(),
      });
    } catch (error) {
      pmToaster.create({
        type: 'error',
        title: `Couldn't move to ${pkg.name}`,
        description: 'Nothing changed. Try again, or check your space access.',
      });
      throw error;
    }
  };

  /**
   * Only a package that is live somewhere earns a prompt: moving into a
   * distributed package adds to what it ships and needs no warning, while
   * moving out of one takes something away at the next sync.
   */
  const requestMove = (pkg: PackageResponse) => {
    if (members.some((source) => isDeployed(source.id))) {
      setMoveTarget(pkg);
    } else {
      void moveToPackage(pkg).catch(() => {
        /* error surfaced via toast */
      });
    }
  };

  const removeFromPackage = async (pkg: PackageResponse) => {
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
    if (isDeployed(pkg.id)) {
      setRemoveTarget(pkg);
    } else {
      void removeFromPackage(pkg).catch(() => {
        /* error surfaced via toast */
      });
    }
  };

  const triggerLabel =
    members.length > 0
      ? `In ${members.length} package${members.length > 1 ? 's' : ''}`
      : 'Add to a package';

  return (
    <>
      <PMPopover.Root
        open={open}
        onOpenChange={(d) => {
          setOpen(d.open);
          if (!d.open) setQuery('');
        }}
        positioning={{ placement: 'bottom-start' }}
      >
        <PMPopover.Trigger asChild>
          <PMHStack
            as="button"
            gap={1}
            alignItems="center"
            color="text.secondary"
            cursor="pointer"
            _hover={{ color: 'text.primary' }}
            data-testid="packages-popover-trigger"
          >
            <PMIcon fontSize="xs">
              <LuPackagePlus />
            </PMIcon>
            <PMText variant="small">{triggerLabel}</PMText>
            <PMIcon fontSize="xs">
              <LuChevronDown />
            </PMIcon>
          </PMHStack>
        </PMPopover.Trigger>

        <PMPortal>
          <PMPopover.Positioner>
            <PMPopover.Content width="360px">
              <PMPopover.Body padding={0}>
                {isLoading ? (
                  <PMVStack gap={2} alignItems="stretch" padding={4}>
                    <PMSkeleton height="20px" />
                    <PMSkeleton height="20px" />
                    <PMSkeleton height="20px" />
                  </PMVStack>
                ) : isError ? (
                  <PMVStack gap={1} alignItems="stretch" padding={4}>
                    <PMText variant="small" color="error">
                      Could not load packages.
                    </PMText>
                    <PMText variant="small" color="faded">
                      Close this and try again.
                    </PMText>
                  </PMVStack>
                ) : noPackages ? (
                  <PMVStack gap={1} alignItems="stretch" padding={4}>
                    <PMText variant="small" fontWeight={600}>
                      No packages in this space yet.
                    </PMText>
                    <PMText variant="small" color="faded">
                      Create a package first, then bundle this{' '}
                      {artifactKindLabel} into it.
                    </PMText>
                  </PMVStack>
                ) : (
                  <PMVStack gap={0} alignItems="stretch">
                    {members.length > 0 ? (
                      <PMVStack gap={1} alignItems="stretch" padding={3}>
                        <SectionLabel>In these packages</SectionLabel>
                        <PMVStack
                          gap={0}
                          alignItems="stretch"
                          maxHeight="190px"
                          overflowY="auto"
                          overflowX="hidden"
                        >
                          {members.map((pkg) => (
                            <MemberRow
                              key={pkg.id}
                              pkg={pkg}
                              disabled={isBusy}
                              onRemove={() => requestRemove(pkg)}
                            />
                          ))}
                        </PMVStack>
                      </PMVStack>
                    ) : (
                      <PMBox padding={3}>
                        <PMText variant="small" color="faded">
                          Not in any package yet. Pick one below.
                        </PMText>
                      </PMBox>
                    )}

                    <PMSeparator />

                    <PMVStack gap={2} alignItems="stretch" padding={3}>
                      <SectionLabel>Move to a package</SectionLabel>
                      {addable.length === 0 ? (
                        <PMText variant="small" color="faded">
                          Already in every package in this space.
                        </PMText>
                      ) : (
                        <>
                          <PMBox position="relative">
                            <PMBox
                              position="absolute"
                              left={2.5}
                              top="50%"
                              transform="translateY(-50%)"
                              color="text.faded"
                              pointerEvents="none"
                            >
                              <PMIcon fontSize="xs">
                                <LuSearch />
                              </PMIcon>
                            </PMBox>
                            <PMInput
                              size="sm"
                              paddingLeft={8}
                              placeholder="Search packages..."
                              value={query}
                              onChange={(e) => setQuery(e.target.value)}
                              aria-label="Search packages"
                            />
                          </PMBox>
                          <PMVStack
                            gap={0}
                            alignItems="stretch"
                            maxHeight="190px"
                            overflowY="auto"
                            overflowX="hidden"
                          >
                            {filteredAddable.length === 0 ? (
                              <PMText
                                variant="small"
                                color="faded"
                                paddingY={2}
                              >
                                No package matches "{query}".
                              </PMText>
                            ) : (
                              filteredAddable.map((pkg) => (
                                <MoveRow
                                  key={pkg.id}
                                  pkg={pkg}
                                  disabled={isBusy}
                                  onMove={() => requestMove(pkg)}
                                />
                              ))
                            )}
                          </PMVStack>
                        </>
                      )}
                    </PMVStack>
                  </PMVStack>
                )}
              </PMPopover.Body>
            </PMPopover.Content>
          </PMPopover.Positioner>
        </PMPortal>
      </PMPopover.Root>

      <MoveArtifactsToPackageConfirm
        open={moveTarget !== null}
        onOpenChange={(o) => {
          if (!o) setMoveTarget(null);
        }}
        targetPackageName={moveTarget?.name ?? ''}
        artifactCount={1}
        kindSingular={artifactKindLabel}
        kindPlural={`${artifactKindLabel}s`}
        emptiedPackages={members.map((source) => ({
          packageName: source.name,
          deployedTargets: getDeployedTargets(source.id),
          deployedMarketplaces: getDeployedMarketplaces(source.id),
        }))}
        onConfirm={async () => {
          if (!moveTarget) return;
          await moveToPackage(moveTarget);
          pmToaster.create({
            type: 'success',
            title: 'Moved to package',
            description: `Now bundled in ${moveTarget.name} only.`,
          });
          setMoveTarget(null);
        }}
      />

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

function MemberRow({
  pkg,
  disabled,
  onRemove,
}: {
  pkg: PackageResponse;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <PMHStack
      gap={2}
      justify="space-between"
      alignItems="center"
      paddingX={2}
      paddingY={1.5}
      borderRadius="sm"
      _hover={{ backgroundColor: 'background.tertiary' }}
    >
      <PMText variant="small" truncate flex={1} minWidth={0} title={pkg.name}>
        {pkg.name}
      </PMText>
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

function MoveRow({
  pkg,
  disabled,
  onMove,
}: {
  pkg: PackageResponse;
  disabled: boolean;
  onMove: () => void;
}) {
  return (
    <PMHStack
      as="button"
      gap={2}
      justify="space-between"
      alignItems="center"
      width="100%"
      textAlign="left"
      paddingX={2}
      paddingY={1.5}
      borderRadius="sm"
      cursor={disabled ? 'not-allowed' : 'pointer'}
      opacity={disabled ? 0.5 : 1}
      pointerEvents={disabled ? 'none' : undefined}
      _hover={{ backgroundColor: 'background.tertiary' }}
      aria-label={`Move to ${pkg.name}`}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onMove}
    >
      <PMVStack gap={0} alignItems="stretch" flex={1} minWidth={0}>
        <PMText variant="small" truncate title={pkg.name}>
          {pkg.name}
        </PMText>
        {pkg.description ? (
          <PMText variant="small" color="faded" truncate>
            {pkg.description}
          </PMText>
        ) : null}
      </PMVStack>
      <PMBox flexShrink={0} color="text.faded">
        <PMIcon fontSize="sm">
          <LuArrowRight />
        </PMIcon>
      </PMBox>
    </PMHStack>
  );
}
