import React from 'react';
import {
  PMAccordion,
  PMBadge,
  PMBox,
  PMHStack,
  PMLink,
  PMSegmentedBar,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import { Link } from 'react-router';
import {
  DeployedRecipeTargetInfo,
  DeployedStandardTargetInfo,
  DeployedSkillTargetInfo,
  PackageId,
  RecipeId,
  SkillId,
  StandardId,
  TargetId,
} from '@packmind/types';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { routes } from '../../../../shared/utils/routes';
import { DistributePackageToTargetButton } from './DistributePackageToTargetButton';

type Mode = 'all' | 'outdated' | 'up-to-date';
type ArtifactKind = 'Command' | 'Standard' | 'Skill';

export type PackageArtifactsTableProps = {
  orgSlug?: string;
  packageName: string;
  packageId: PackageId;
  targetId: TargetId;
  recipes: ReadonlyArray<DeployedRecipeTargetInfo>;
  standards: ReadonlyArray<DeployedStandardTargetInfo>;
  skills: ReadonlyArray<DeployedSkillTargetInfo>;
  pendingRecipes?: ReadonlyArray<{ id: RecipeId; name: string; slug: string }>;
  pendingStandards?: ReadonlyArray<{
    id: StandardId;
    name: string;
    slug: string;
  }>;
  pendingSkills?: ReadonlyArray<{ id: SkillId; name: string; slug: string }>;
  mode?: Mode;
  canDistributeFromApp: boolean;
  isDistributeReadinessLoading: boolean;
};

type NormalizedArtifact = {
  kind: ArtifactKind;
  name: string;
  deployedVersion: number;
  latestVersion: number;
  isUpToDate: boolean;
  isDeleted: boolean;
  isPending: boolean;
  routePath?: string;
};

const TABLE_COLUMNS: PMTableColumn[] = [
  { key: 'name', header: 'Name', grow: true },
  {
    key: 'version',
    header: 'Version (distributed → latest)',
    align: 'center',
    grow: true,
  },
  { key: 'status', header: 'Status', align: 'center' },
];

const KIND_TOOLTIP_NOUN: Record<ArtifactKind, string> = {
  Command: 'command',
  Standard: 'standard',
  Skill: 'skill',
};

const getGapPalette = (gap: number): 'blue' | 'orange' | 'red' => {
  if (gap >= 10) return 'red';
  if (gap >= 5) return 'orange';
  return 'blue';
};

const matchesMode = (a: NormalizedArtifact, mode: Mode): boolean => {
  if (a.isPending) {
    return mode === 'all' || mode === 'outdated';
  }
  if (mode === 'outdated') return !a.isUpToDate || a.isDeleted;
  if (mode === 'up-to-date') return a.isUpToDate && !a.isDeleted;
  return true;
};

const renderVersionCell = (
  a: NormalizedArtifact,
  mode: Mode,
): React.ReactNode => {
  if (a.isPending) {
    return (
      <PMText variant="small" color="faded">
        —
      </PMText>
    );
  }
  if (mode !== 'outdated' && a.isUpToDate) {
    return (
      <PMBadge colorPalette="gray" size="sm">
        {a.deployedVersion}
      </PMBadge>
    );
  }
  const palette = getGapPalette(a.latestVersion - a.deployedVersion);
  return (
    <PMHStack gap={2} justify="center" align="center">
      <PMBadge colorPalette="gray" size="sm">
        {a.deployedVersion}
      </PMBadge>
      <PMText variant="small" color="faded">
        →
      </PMText>
      <PMBadge colorPalette={palette} size="sm">
        {a.latestVersion}
      </PMBadge>
    </PMHStack>
  );
};

const renderStatusCell = (
  a: NormalizedArtifact,
  mode: Mode,
): React.ReactNode => {
  if (a.isPending) {
    return (
      <PMBadge colorPalette="orange" size="sm">
        Pending distribution
      </PMBadge>
    );
  }
  if (a.isDeleted) {
    return (
      <PMTooltip
        label={`The ${KIND_TOOLTIP_NOUN[a.kind]} deletion will be effective on the repository after a \`packmind-cli install\` or git distribution from web app`}
        placement="top"
      >
        <PMBadge colorPalette="red" size="sm">
          Needs removal
        </PMBadge>
      </PMTooltip>
    );
  }
  if (mode === 'outdated' || !a.isUpToDate) {
    return (
      <PMBadge colorPalette="red" size="sm">
        Outdated
      </PMBadge>
    );
  }
  return (
    <PMBadge colorPalette="green" size="sm">
      Up-to-date
    </PMBadge>
  );
};

const renderNameCell = (a: NormalizedArtifact): React.ReactNode => (
  <PMVStack align="start" gap={0}>
    <PMText variant="small" color="tertiary">
      {a.kind}
    </PMText>
    {a.routePath ? (
      <PMLink asChild>
        <Link to={a.routePath}>{a.name}</Link>
      </PMLink>
    ) : (
      <PMText variant="body-important">{a.name}</PMText>
    )}
  </PMVStack>
);

const toTableRow = (a: NormalizedArtifact, mode: Mode): PMTableRow => ({
  name: renderNameCell(a),
  version: renderVersionCell(a, mode),
  status: renderStatusCell(a, mode),
});

const sortByName = (items: NormalizedArtifact[]): NormalizedArtifact[] =>
  items.sort((a, b) => a.name.localeCompare(b.name));

export const PackageArtifactsTable: React.FC<PackageArtifactsTableProps> = ({
  orgSlug,
  packageName,
  packageId,
  targetId,
  recipes,
  standards,
  skills,
  pendingRecipes = [],
  pendingStandards = [],
  pendingSkills = [],
  mode = 'all',
  canDistributeFromApp,
  isDistributeReadinessLoading,
}) => {
  const { spaceSlug } = useCurrentSpace();

  const normalizedStandards: NormalizedArtifact[] = standards.map((d) => ({
    kind: 'Standard',
    name: d.standard.name,
    deployedVersion: d.deployedVersion.version,
    latestVersion: d.latestVersion.version,
    isUpToDate: d.isUpToDate,
    isDeleted: !!d.isDeleted,
    isPending: false,
    routePath:
      orgSlug && spaceSlug
        ? routes.space.toStandard(orgSlug, spaceSlug, d.standard.id)
        : undefined,
  }));

  pendingStandards.forEach((s) => {
    normalizedStandards.push({
      kind: 'Standard',
      name: s.name,
      deployedVersion: 0,
      latestVersion: 0,
      isUpToDate: false,
      isDeleted: false,
      isPending: true,
      routePath:
        orgSlug && spaceSlug
          ? routes.space.toStandard(orgSlug, spaceSlug, s.id)
          : undefined,
    });
  });

  const normalizedRecipes: NormalizedArtifact[] = recipes.map((d) => ({
    kind: 'Command',
    name: d.recipe.name,
    deployedVersion: d.deployedVersion.version,
    latestVersion: d.latestVersion.version,
    isUpToDate: d.isUpToDate,
    isDeleted: !!d.isDeleted,
    isPending: false,
    routePath:
      orgSlug && spaceSlug
        ? routes.space.toCommand(orgSlug, spaceSlug, d.recipe.id)
        : undefined,
  }));

  pendingRecipes.forEach((r) => {
    normalizedRecipes.push({
      kind: 'Command',
      name: r.name,
      deployedVersion: 0,
      latestVersion: 0,
      isUpToDate: false,
      isDeleted: false,
      isPending: true,
      routePath:
        orgSlug && spaceSlug
          ? routes.space.toCommand(orgSlug, spaceSlug, r.id)
          : undefined,
    });
  });

  const normalizedSkills: NormalizedArtifact[] = skills.map((d) => ({
    kind: 'Skill',
    name: d.skill.name,
    deployedVersion: d.deployedVersion.version,
    latestVersion: d.latestVersion.version,
    isUpToDate: d.isUpToDate,
    isDeleted: !!d.isDeleted,
    isPending: false,
    routePath:
      orgSlug && spaceSlug
        ? routes.space.toSkill(orgSlug, spaceSlug, d.skill.slug)
        : undefined,
  }));

  pendingSkills.forEach((s) => {
    normalizedSkills.push({
      kind: 'Skill',
      name: s.name,
      deployedVersion: 0,
      latestVersion: 0,
      isUpToDate: false,
      isDeleted: false,
      isPending: true,
      routePath:
        orgSlug && spaceSlug
          ? routes.space.toSkill(orgSlug, spaceSlug, s.slug)
          : undefined,
    });
  });

  const rows: PMTableRow[] = [
    ...sortByName(normalizedStandards.filter((a) => matchesMode(a, mode))),
    ...sortByName(normalizedRecipes.filter((a) => matchesMode(a, mode))),
    ...sortByName(normalizedSkills.filter((a) => matchesMode(a, mode))),
  ].map((a) => toTableRow(a, mode));

  if (rows.length === 0) {
    return null;
  }

  const allDeployed = [...recipes, ...standards, ...skills];
  const inSyncCount = allDeployed.filter(
    (a) => a.isUpToDate && !a.isDeleted,
  ).length;
  const driftCount = allDeployed.filter(
    (a) => !a.isUpToDate || a.isDeleted,
  ).length;
  const pendingCount =
    pendingRecipes.length + pendingStandards.length + pendingSkills.length;
  const totalArtifacts = inSyncCount + driftCount + pendingCount;

  return (
    <PMAccordion.Item
      value={packageId}
      border="solid 1px"
      borderColor="border.secondary"
      borderRadius={4}
      width="full"
    >
      <PMHStack gap={2} align="center" justify="space-between" pr={2}>
        <PMAccordion.ItemTrigger
          flex="1"
          px={2}
          py={1}
          _hover={{ cursor: 'pointer', bg: 'background.tertiary' }}
        >
          <PMHStack gap={2} align="center" flex="1">
            <PMAccordion.ItemIndicator />
            <PMBadge colorPalette="gray" size="xs">
              Package
            </PMBadge>
            <PMText variant="body-important">{packageName}</PMText>
            <PMHStack flex="1" justify="flex-end">
              {totalArtifacts > 0 && (
                <PMSegmentedBar
                  width="160px"
                  segments={[
                    {
                      value: inSyncCount,
                      colorPalette: 'green',
                      label: `${inSyncCount} in sync`,
                    },
                    {
                      value: driftCount,
                      colorPalette: 'red',
                      label: `${driftCount} outdated`,
                    },
                    {
                      value: pendingCount,
                      colorPalette: 'orange',
                      label: `${pendingCount} pending`,
                    },
                  ]}
                />
              )}
            </PMHStack>
          </PMHStack>
        </PMAccordion.ItemTrigger>
        <DistributePackageToTargetButton
          packageId={packageId}
          packageName={packageName}
          targetId={targetId}
          canDistributeFromApp={canDistributeFromApp}
          isDistributeReadinessLoading={isDistributeReadinessLoading}
        />
      </PMHStack>
      <PMAccordion.ItemContent>
        <PMBox px={2} pb={2}>
          <PMTable columns={TABLE_COLUMNS} data={rows} size="sm" />
        </PMBox>
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
};
