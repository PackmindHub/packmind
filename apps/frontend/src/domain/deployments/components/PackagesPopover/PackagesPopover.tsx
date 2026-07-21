import { useMemo, useState } from 'react';
import {
  LuChevronDown,
  LuPackagePlus,
  LuPlus,
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
  useAddArtefactsToPackagesMutation,
  useRemoveArtefactsFromPackageMutation,
  AddArtefactsToPackagesEntry,
} from '../../api/queries/DeploymentsQueries';
import { getArtifactPackages } from '../../hooks/usePackagesForArtifact';
import { usePackageDeploymentStatus } from '../../hooks/usePackageDeploymentStatus';
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

/**
 * Interactive breadcrumb widget for managing an artifact's package membership
 * in place. Adding is instant; removing from a deployed package asks for
 * confirmation first, removing from an undeployed one is instant. Replaces the
 * read-only PackageCountHeaderInfo.
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

  const {
    data: packagesResponse,
    isLoading,
    isError,
  } = useListPackagesBySpaceQuery(spaceId, organizationId);
  const { getDeployedTargets, getDeployedMarketplaces, isDeployed } =
    usePackageDeploymentStatus(spaceId, organizationId);
  const { mutateAsync: addArtefacts, isPending: isAdding } =
    useAddArtefactsToPackagesMutation();
  const { mutateAsync: removeArtefacts, isPending: isRemoving } =
    useRemoveArtefactsFromPackageMutation();

  const allPackages = useMemo(
    () => packagesResponse?.packages ?? [],
    [packagesResponse],
  );

  const members = useMemo(() => {
    if (!artifactId) return [];
    return getArtifactPackages(allPackages, artifactId, artifactType);
  }, [allPackages, artifactId, artifactType]);

  const addable = useMemo(() => {
    const memberIds = new Set(members.map((p) => p.id.toString()));
    return allPackages.filter((p) => !memberIds.has(p.id.toString()));
  }, [allPackages, members]);

  const filteredAddable = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? addable.filter((p) => p.name.toLowerCase().includes(q))
      : addable;
  }, [addable, query]);

  if (!artifactId || !spaceId || !organizationId) return null;

  const noPackages = !isLoading && !isError && allPackages.length === 0;
  const isBusy = isAdding || isRemoving;

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

  const handleAdd = async (pkg: PackageResponse) => {
    try {
      const outcomes = await addArtefacts({
        spaceId,
        entries: [{ packageId: pkg.id, ...artifactIdsPayload() }],
      });
      if (outcomes.some((o) => !o.ok)) {
        pmToaster.create({
          type: 'error',
          title: `Couldn't add to ${pkg.name}`,
          description: 'Try again, or check your space access.',
        });
      }
    } catch {
      pmToaster.create({
        type: 'error',
        title: `Couldn't add to ${pkg.name}`,
        description: 'Try again, or check your space access.',
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
                          Not in any package yet. Pick one below to add it.
                        </PMText>
                      </PMBox>
                    )}

                    <PMSeparator />

                    <PMVStack gap={2} alignItems="stretch" padding={3}>
                      <SectionLabel>Add to a package</SectionLabel>
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
                                <AddRow
                                  key={pkg.id}
                                  pkg={pkg}
                                  disabled={isBusy}
                                  onAdd={() => handleAdd(pkg)}
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

function AddRow({
  pkg,
  disabled,
  onAdd,
}: {
  pkg: PackageResponse;
  disabled: boolean;
  onAdd: () => void;
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
      aria-disabled={disabled}
      onClick={disabled ? undefined : onAdd}
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
          <LuPlus />
        </PMIcon>
      </PMBox>
    </PMHStack>
  );
}
