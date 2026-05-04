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

type Row = {
  kind: ArtifactKind;
  name: string;
  deployedVersion: number;
  latestVersion: number;
  isUpToDate: boolean;
  isDeleted: boolean;
  isPending: boolean;
  routePath?: string;
};

type RouteCtx = {
  orgSlug?: string;
  spaceSlug?: string;
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

const matchesMode = (row: Row, mode: Mode): boolean => {
  if (row.isPending) return mode !== 'up-to-date';
  if (mode === 'outdated') return !row.isUpToDate || row.isDeleted;
  if (mode === 'up-to-date') return row.isUpToDate && !row.isDeleted;
  return true;
};

const buildRows = (
  props: Pick<
    PackageArtifactsTableProps,
    | 'recipes'
    | 'standards'
    | 'skills'
    | 'pendingRecipes'
    | 'pendingStandards'
    | 'pendingSkills'
  >,
  ctx: RouteCtx,
): Row[] => {
  const rows: Row[] = [];

  props.standards.forEach((d) =>
    rows.push({
      kind: 'Standard',
      name: d.standard.name,
      deployedVersion: d.deployedVersion.version,
      latestVersion: d.latestVersion.version,
      isUpToDate: d.isUpToDate,
      isDeleted: !!d.isDeleted,
      isPending: false,
      routePath: standardRoute(ctx, d.standard.id),
    }),
  );
  (props.pendingStandards ?? []).forEach((s) =>
    rows.push({
      kind: 'Standard',
      name: s.name,
      deployedVersion: 0,
      latestVersion: 0,
      isUpToDate: false,
      isDeleted: false,
      isPending: true,
      routePath: standardRoute(ctx, s.id),
    }),
  );

  props.recipes.forEach((d) =>
    rows.push({
      kind: 'Command',
      name: d.recipe.name,
      deployedVersion: d.deployedVersion.version,
      latestVersion: d.latestVersion.version,
      isUpToDate: d.isUpToDate,
      isDeleted: !!d.isDeleted,
      isPending: false,
      routePath: commandRoute(ctx, d.recipe.id),
    }),
  );
  (props.pendingRecipes ?? []).forEach((r) =>
    rows.push({
      kind: 'Command',
      name: r.name,
      deployedVersion: 0,
      latestVersion: 0,
      isUpToDate: false,
      isDeleted: false,
      isPending: true,
      routePath: commandRoute(ctx, r.id),
    }),
  );

  props.skills.forEach((d) =>
    rows.push({
      kind: 'Skill',
      name: d.skill.name,
      deployedVersion: d.deployedVersion.version,
      latestVersion: d.latestVersion.version,
      isUpToDate: d.isUpToDate,
      isDeleted: !!d.isDeleted,
      isPending: false,
      routePath: skillRoute(ctx, d.skill.slug),
    }),
  );
  (props.pendingSkills ?? []).forEach((s) =>
    rows.push({
      kind: 'Skill',
      name: s.name,
      deployedVersion: 0,
      latestVersion: 0,
      isUpToDate: false,
      isDeleted: false,
      isPending: true,
      routePath: skillRoute(ctx, s.slug),
    }),
  );

  return rows;
};

const standardRoute = (ctx: RouteCtx, id: StandardId) =>
  ctx.orgSlug && ctx.spaceSlug
    ? routes.space.toStandard(ctx.orgSlug, ctx.spaceSlug, id)
    : undefined;

const commandRoute = (ctx: RouteCtx, id: RecipeId) =>
  ctx.orgSlug && ctx.spaceSlug
    ? routes.space.toCommand(ctx.orgSlug, ctx.spaceSlug, id)
    : undefined;

const skillRoute = (ctx: RouteCtx, slug: string) =>
  ctx.orgSlug && ctx.spaceSlug
    ? routes.space.toSkill(ctx.orgSlug, ctx.spaceSlug, slug)
    : undefined;

const renderVersionCell = (row: Row, mode: Mode): React.ReactNode => {
  if (row.isPending) {
    return (
      <PMText variant="small" color="faded">
        —
      </PMText>
    );
  }
  if (mode !== 'outdated' && row.isUpToDate) {
    return (
      <PMBadge colorPalette="gray" size="sm">
        {row.deployedVersion}
      </PMBadge>
    );
  }
  const palette = getGapPalette(row.latestVersion - row.deployedVersion);
  return (
    <PMHStack gap={2} justify="center" align="center">
      <PMBadge colorPalette="gray" size="sm">
        {row.deployedVersion}
      </PMBadge>
      <PMText variant="small" color="faded">
        →
      </PMText>
      <PMBadge colorPalette={palette} size="sm">
        {row.latestVersion}
      </PMBadge>
    </PMHStack>
  );
};

const renderStatusCell = (row: Row, mode: Mode): React.ReactNode => {
  if (row.isPending) {
    return (
      <PMBadge colorPalette="orange" size="sm">
        Pending distribution
      </PMBadge>
    );
  }
  if (row.isDeleted) {
    return (
      <PMTooltip
        label={`The ${KIND_TOOLTIP_NOUN[row.kind]} deletion will be effective on the repository after a \`packmind-cli install\` or git distribution from web app`}
        placement="top"
      >
        <PMBadge colorPalette="red" size="sm">
          Needs removal
        </PMBadge>
      </PMTooltip>
    );
  }
  if (mode === 'outdated' || !row.isUpToDate) {
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

const renderNameCell = (row: Row): React.ReactNode => (
  <PMVStack align="start" gap={0}>
    <PMText variant="small" color="tertiary">
      {row.kind}
    </PMText>
    {row.routePath ? (
      <PMLink asChild>
        <Link to={row.routePath}>{row.name}</Link>
      </PMLink>
    ) : (
      <PMText variant="body-important">{row.name}</PMText>
    )}
  </PMVStack>
);

const toTableRow = (row: Row, mode: Mode): PMTableRow => ({
  name: renderNameCell(row),
  version: renderVersionCell(row, mode),
  status: renderStatusCell(row, mode),
});

const sortRows = (rows: Row[]): Row[] => {
  const kindOrder: Record<ArtifactKind, number> = {
    Standard: 0,
    Command: 1,
    Skill: 2,
  };
  return [...rows].sort((a, b) => {
    if (a.kind !== b.kind) return kindOrder[a.kind] - kindOrder[b.kind];
    return a.name.localeCompare(b.name);
  });
};

export const PackageArtifactsTable: React.FC<PackageArtifactsTableProps> = (
  props,
) => {
  const {
    orgSlug,
    packageName,
    packageId,
    targetId,
    mode = 'all',
    canDistributeFromApp,
    isDistributeReadinessLoading,
  } = props;
  const { spaceSlug } = useCurrentSpace();

  const allRows = buildRows(props, { orgSlug, spaceSlug });
  const visibleRows = sortRows(allRows.filter((row) => matchesMode(row, mode)));

  if (visibleRows.length === 0) {
    return null;
  }

  const inSyncCount = allRows.filter(
    (row) => !row.isPending && row.isUpToDate && !row.isDeleted,
  ).length;
  const driftCount = allRows.filter(
    (row) => !row.isPending && (!row.isUpToDate || row.isDeleted),
  ).length;
  const pendingCount = allRows.filter((row) => row.isPending).length;
  const totalArtifacts = inSyncCount + driftCount + pendingCount;
  const hasOutdatedArtifacts = driftCount + pendingCount > 0;

  const tableRows = visibleRows.map((row) => toTableRow(row, mode));

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
          _hover={{ cursor: 'pointer' }}
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
          hasOutdatedArtifacts={hasOutdatedArtifacts}
        />
      </PMHStack>
      <PMAccordion.ItemContent>
        <PMBox px={2} pb={2}>
          <PMTable columns={TABLE_COLUMNS} data={tableRows} size="sm" />
        </PMBox>
      </PMAccordion.ItemContent>
    </PMAccordion.Item>
  );
};
