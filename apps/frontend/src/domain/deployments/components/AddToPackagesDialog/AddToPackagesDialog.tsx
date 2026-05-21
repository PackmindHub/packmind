import { useMemo, useState } from 'react';
import { LuPackagePlus, LuSearch } from 'react-icons/lu';
import {
  PMBox,
  PMButton,
  PMButtonGroup,
  PMCheckbox,
  PMCloseButton,
  PMDialog,
  PMHStack,
  PMIcon,
  PMInput,
  PMInputGroup,
  PMLink,
  PMSkeleton,
  PMText,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import {
  OrganizationId,
  Package,
  PackageId,
  RecipeId,
  SkillId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { Link as RouterLink } from 'react-router';
import { routes } from '../../../../shared/utils/routes';
import {
  AddArtefactsToPackagesEntry,
  useAddArtefactsToPackagesMutation,
} from '../../api/queries/DeploymentsQueries';
import { usePackagesMissingAnyArtifact } from '../../hooks/usePackagesMissingAnyArtifact';

export type AddToPackagesArtifactKind = 'standard' | 'command' | 'skill';

type ArtifactType = 'standard' | 'recipe' | 'skill';
type ArtifactId = StandardId | RecipeId | SkillId;

interface AddToPackagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifactIds: ArtifactId[];
  artifactType: ArtifactType;
  artifactKindLabel: AddToPackagesArtifactKind;
  organizationId: OrganizationId;
  spaceId: SpaceId;
  orgSlug?: string;
  spaceSlug?: string;
}

const ARTIFACT_KIND_PLURALS: Record<AddToPackagesArtifactKind, string> = {
  standard: 'standards',
  command: 'commands',
  skill: 'skills',
};

const pluralizePackages = (count: number) =>
  count === 1 ? 'package' : 'packages';

function summarizePackageList(packages: Package[]): string {
  if (packages.length === 0) return '';
  if (packages.length === 1) return packages[0].name;
  if (packages.length === 2)
    return `${packages[0].name} and ${packages[1].name}`;
  if (packages.length === 3)
    return `${packages[0].name}, ${packages[1].name}, and ${packages[2].name}`;
  return `${packages[0].name}, ${packages[1].name}, and ${packages.length - 2} more`;
}

function buildArtefactEntry(
  packageId: PackageId,
  artifactType: ArtifactType,
  ids: ArtifactId[],
): AddArtefactsToPackagesEntry {
  switch (artifactType) {
    case 'standard':
      return { packageId, standardIds: ids as StandardId[] };
    case 'recipe':
      return { packageId, recipeIds: ids as RecipeId[] };
    case 'skill':
      return { packageId, skillIds: ids as SkillId[] };
  }
}

export const AddToPackagesDialog = ({
  open,
  onOpenChange,
  artifactIds,
  artifactType,
  artifactKindLabel,
  organizationId,
  spaceId,
  orgSlug,
  spaceSlug,
}: AddToPackagesDialogProps) => {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<PackageId>>(new Set());

  const artifactCount = artifactIds.length;
  const kindSingular = artifactKindLabel;
  const kindPlural = ARTIFACT_KIND_PLURALS[artifactKindLabel];

  const {
    addablePackages,
    presentArtifactIdsByPackageId,
    totalPackages,
    isLoading,
  } = usePackagesMissingAnyArtifact({
    artifactIds,
    artifactType,
    spaceId,
    organizationId,
  });

  const filteredPackages = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return addablePackages;
    return addablePackages.filter((pkg) =>
      pkg.name.toLowerCase().includes(trimmed),
    );
  }, [addablePackages, query]);

  const { mutateAsync, isPending } = useAddArtefactsToPackagesMutation();

  const selectedCount = selectedIds.size;
  const isSubmitDisabled = selectedCount === 0 || isPending;

  const resetState = () => {
    setQuery('');
    setSelectedIds(new Set());
  };

  const handleOpenChange = (details: { open: boolean }) => {
    onOpenChange(details.open);
    if (!details.open) {
      resetState();
    }
  };

  const toggleSelection = (packageId: PackageId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(packageId)) {
        next.delete(packageId);
      } else {
        next.add(packageId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedCount === 0) return;
    const selectedPackages = addablePackages.filter((pkg) =>
      selectedIds.has(pkg.id),
    );
    const entries: AddArtefactsToPackagesEntry[] = selectedPackages.map(
      (pkg) => {
        const presentSet =
          presentArtifactIdsByPackageId[pkg.id.toString()] ?? new Set<string>();
        const remaining = artifactIds.filter(
          (id) => !presentSet.has(id.toString()),
        );
        return buildArtefactEntry(pkg.id, artifactType, remaining);
      },
    );
    try {
      const outcomes = await mutateAsync({ spaceId, entries });
      const successOutcomes = outcomes.filter((o) => o.ok);
      const failureOutcomes = outcomes.filter((o) => !o.ok);

      if (failureOutcomes.length === 0) {
        const packageNoun = pluralizePackages(successOutcomes.length);
        const title =
          artifactCount === 1
            ? `Added to ${successOutcomes.length} ${packageNoun}`
            : `Added ${artifactCount} ${kindPlural} to ${successOutcomes.length} ${packageNoun}`;
        pmToaster.create({
          type: 'success',
          title,
          description: summarizePackageList(selectedPackages),
        });
        onOpenChange(false);
        resetState();
        return;
      }

      if (successOutcomes.length === 0) {
        pmToaster.create({
          type: 'error',
          title: "Couldn't add to packages",
          description:
            failureOutcomes[0].ok === false
              ? failureOutcomes[0].error.message
              : 'Try again, or check your space access.',
        });
        return;
      }

      const successIds = new Set(
        successOutcomes.map((o) => o.packageId.toString()),
      );
      const succeededPackages = selectedPackages.filter((p) =>
        successIds.has(p.id.toString()),
      );
      pmToaster.create({
        type: 'warning',
        title: `Added to ${successOutcomes.length} of ${outcomes.length} packages`,
        description: `Succeeded: ${summarizePackageList(succeededPackages)}.`,
      });
      setSelectedIds(
        new Set(failureOutcomes.filter((o) => !o.ok).map((o) => o.packageId)),
      );
    } catch (error) {
      pmToaster.create({
        type: 'error',
        title: "Couldn't add to packages",
        description:
          (error as Error)?.message || 'Try again, or check your space access.',
      });
    }
  };

  const renderListBody = () => {
    if (isLoading) {
      return (
        <PMVStack gap={2} alignItems="stretch">
          <PMSkeleton height="56px" />
          <PMSkeleton height="56px" />
          <PMSkeleton height="56px" />
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

    if (addablePackages.length === 0) {
      const allCoveredMessage =
        artifactCount === 1
          ? `This ${kindSingular} is already in every package in this space.`
          : `These ${artifactCount} ${kindPlural} are already in every package in this space.`;
      return (
        <PMBox paddingY={6} paddingX={2}>
          <PMText variant="body">{allCoveredMessage}</PMText>
        </PMBox>
      );
    }

    if (filteredPackages.length === 0) {
      return (
        <PMVStack gap={2} alignItems="flex-start" paddingY={6} paddingX={2}>
          <PMText variant="body">No packages match "{query}".</PMText>
          <PMLink
            variant="underline"
            fontSize="sm"
            cursor="pointer"
            onClick={() => setQuery('')}
          >
            Clear search
          </PMLink>
        </PMVStack>
      );
    }

    return (
      <PMVStack gap={2} alignItems="stretch" role="list">
        {filteredPackages.map((pkg) => {
          const checked = selectedIds.has(pkg.id);
          const presentCount =
            presentArtifactIdsByPackageId[pkg.id.toString()]?.size ?? 0;
          const showOverlapHint =
            artifactCount > 1 &&
            presentCount > 0 &&
            presentCount < artifactCount;
          return (
            <PMHStack
              key={pkg.id}
              role="listitem"
              alignItems="center"
              gap={3}
              paddingY={3}
              paddingX={3}
              border="1px solid"
              borderColor="border.secondary"
              borderRadius="sm"
              cursor={isPending ? 'not-allowed' : 'pointer'}
              backgroundColor={checked ? 'background.tertiary' : undefined}
              _hover={
                isPending
                  ? undefined
                  : { backgroundColor: 'background.tertiary' }
              }
              onClick={() => {
                if (isPending) return;
                toggleSelection(pkg.id);
              }}
            >
              <PMCheckbox
                checked={checked}
                disabled={isPending}
                onCheckedChange={() => toggleSelection(pkg.id)}
                onClick={(event) => event.stopPropagation()}
                aria-label={`Add to ${pkg.name}`}
              />
              <PMVStack alignItems="flex-start" gap={0.5} flex={1} minWidth={0}>
                <PMText variant="body" fontWeight={500}>
                  {pkg.name}
                </PMText>
                {showOverlapHint ? (
                  <PMText variant="small" color="faded">
                    Already includes {presentCount} of {artifactCount}
                  </PMText>
                ) : pkg.description ? (
                  <PMText variant="small" color="secondary" lineClamp={1}>
                    {pkg.description}
                  </PMText>
                ) : null}
              </PMVStack>
            </PMHStack>
          );
        })}
      </PMVStack>
    );
  };

  const showSearchAndCta = addablePackages.length > 0 && !isLoading;

  const subtitle =
    artifactCount === 1
      ? `Pick the packages this ${kindSingular} should also ship in.`
      : `Pick the packages these ${artifactCount} ${kindPlural} should also ship in.`;

  const submitLabel = (() => {
    if (selectedCount === 0) return 'Add to packages';
    const packageNoun = pluralizePackages(selectedCount);
    if (artifactCount === 1) {
      return `Add to ${selectedCount} ${packageNoun}`;
    }
    return `Add ${artifactCount} ${kindPlural} to ${selectedCount} ${packageNoun}`;
  })();

  return (
    <PMDialog.Root
      closeOnInteractOutside={!isPending}
      open={open}
      onOpenChange={handleOpenChange}
      size="lg"
      scrollBehavior="inside"
    >
      <PMDialog.Backdrop />
      <PMDialog.Positioner>
        <PMDialog.Content>
          <PMDialog.Header>
            <PMVStack alignItems="flex-start" gap={1}>
              <PMDialog.Title>Add to packages</PMDialog.Title>
              <PMText variant="small" color="secondary">
                {subtitle}
              </PMText>
            </PMVStack>
            <PMDialog.CloseTrigger asChild>
              <PMCloseButton />
            </PMDialog.CloseTrigger>
          </PMDialog.Header>
          <PMDialog.Body>
            <PMVStack gap={4} alignItems="stretch">
              {showSearchAndCta ? (
                <PMInputGroup startElement={<LuSearch />}>
                  <PMInput
                    placeholder="Search packages..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    disabled={isPending}
                    aria-label="Search packages"
                  />
                </PMInputGroup>
              ) : null}
              {renderListBody()}
            </PMVStack>
          </PMDialog.Body>
          <PMDialog.Footer>
            <PMButtonGroup size="sm">
              <PMDialog.Trigger asChild>
                <PMButton variant="tertiary" disabled={isPending}>
                  Cancel
                </PMButton>
              </PMDialog.Trigger>
              {showSearchAndCta ? (
                <PMButton
                  variant="primary"
                  onClick={handleSubmit}
                  loading={isPending}
                  disabled={isSubmitDisabled}
                >
                  <PMIcon>
                    <LuPackagePlus />
                  </PMIcon>
                  {submitLabel}
                </PMButton>
              ) : null}
            </PMButtonGroup>
          </PMDialog.Footer>
        </PMDialog.Content>
      </PMDialog.Positioner>
    </PMDialog.Root>
  );
};
