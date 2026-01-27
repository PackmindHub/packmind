import React from 'react';
import {
  PMBadge,
  PMBox,
  PMHStack,
  PMIcon,
  PMLink,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { Link } from 'react-router';
import { LuCircleCheckBig } from 'react-icons/lu';
import {
  TargetId,
  DeployedRecipeTargetInfo,
  DeployedStandardTargetInfo,
  DeployedSkillTargetInfo,
} from '@packmind/types';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { routes } from '../../../../shared/utils/routes';

export type RepositoryTargetTableProps = {
  orgSlug?: string;
  target: { id: TargetId; name: string; path?: string };
  recipes: ReadonlyArray<DeployedRecipeTargetInfo>;
  standards: ReadonlyArray<DeployedStandardTargetInfo>;
  skills: ReadonlyArray<DeployedSkillTargetInfo>;
  mode?: 'all' | 'outdated' | 'up-to-date';
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

const getGapPalette = (gap: number): 'blue' | 'orange' | 'red' => {
  if (gap >= 10) return 'red';
  if (gap >= 5) return 'orange';
  return 'blue';
};

export const RepositoryTargetTable: React.FC<RepositoryTargetTableProps> = ({
  orgSlug,
  target,
  recipes,
  standards,
  skills,
  mode = 'all',
}) => {
  const { spaceSlug } = useCurrentSpace();

  const filterItems = <T extends { isUpToDate: boolean; isDeleted?: boolean }>(
    items: T[],
  ) => {
    if (mode === 'outdated')
      return items.filter((i) => !i.isUpToDate || i.isDeleted);
    if (mode === 'up-to-date')
      return items.filter((i) => i.isUpToDate && !i.isDeleted);
    return items;
  };

  const recipeRows: PMTableRow[] = filterItems([...recipes])
    .sort((a, b) => a.recipe.name.localeCompare(b.recipe.name))
    .map((d) => {
      // compute cells
      const versionNode =
        mode !== 'outdated' && d.isUpToDate ? (
          <PMBadge colorPalette="gray" size="sm">
            {d.deployedVersion.version}
          </PMBadge>
        ) : (
          <PMHStack gap={2} justify="center" align="center">
            <PMBadge colorPalette="gray" size="sm">
              {d.deployedVersion.version}
            </PMBadge>
            <PMText variant="small" color="faded">
              →
            </PMText>
            {(() => {
              const gap = d.latestVersion.version - d.deployedVersion.version;
              const palette = getGapPalette(gap);
              return (
                <PMBadge colorPalette={palette} size="sm">
                  {d.latestVersion.version}
                </PMBadge>
              );
            })()}
          </PMHStack>
        );

      let statusNode: React.ReactNode;
      if (d.isDeleted) {
        statusNode = (
          <PMBadge colorPalette="red" size="sm">
            Needs removal
          </PMBadge>
        );
      } else if (mode === 'outdated') {
        statusNode = (
          <PMBadge colorPalette="red" size="sm">
            Outdated
          </PMBadge>
        );
      } else {
        statusNode = d.isUpToDate ? (
          <PMBadge colorPalette="green" size="sm">
            Up-to-date
          </PMBadge>
        ) : (
          <PMBadge colorPalette="red" size="sm">
            Outdated
          </PMBadge>
        );
      }

      return {
        name: (
          <PMVStack align="start" gap={0}>
            <PMText variant="small" color="tertiary">
              Command
            </PMText>
            {orgSlug && spaceSlug ? (
              <PMLink asChild>
                <Link
                  to={routes.space.toCommand(orgSlug, spaceSlug, d.recipe.id)}
                >
                  {d.recipe.name}
                </Link>
              </PMLink>
            ) : (
              <PMText variant="body-important">{d.recipe.name}</PMText>
            )}
          </PMVStack>
        ),
        version: versionNode,
        status: statusNode,
      };
    });

  const standardRows: PMTableRow[] = filterItems([...standards])
    .sort((a, b) => a.standard.name.localeCompare(b.standard.name))
    .map((d) => {
      const versionNode =
        mode !== 'outdated' && d.isUpToDate ? (
          <PMBadge colorPalette="gray" size="sm">
            {d.deployedVersion.version}
          </PMBadge>
        ) : (
          <PMHStack gap={2} justify="center" align="center">
            <PMBadge colorPalette="gray" size="sm">
              {d.deployedVersion.version}
            </PMBadge>
            <PMText variant="small" color="faded">
              →
            </PMText>
            {(() => {
              const gap = d.latestVersion.version - d.deployedVersion.version;
              const palette = getGapPalette(gap);
              return (
                <PMBadge colorPalette={palette} size="sm">
                  {d.latestVersion.version}
                </PMBadge>
              );
            })()}
          </PMHStack>
        );

      let statusNode: React.ReactNode;
      if (d.isDeleted) {
        statusNode = (
          <PMBadge colorPalette="red" size="sm">
            Needs removal
          </PMBadge>
        );
      } else if (mode === 'outdated') {
        statusNode = (
          <PMBadge colorPalette="red" size="sm">
            Outdated
          </PMBadge>
        );
      } else {
        statusNode = d.isUpToDate ? (
          <PMBadge colorPalette="green" size="sm">
            Up-to-date
          </PMBadge>
        ) : (
          <PMBadge colorPalette="red" size="sm">
            Outdated
          </PMBadge>
        );
      }

      return {
        name: (
          <PMVStack align="start" gap={0}>
            <PMText variant="small" color="tertiary">
              Standard
            </PMText>
            {orgSlug && spaceSlug ? (
              <PMLink asChild>
                <Link
                  to={routes.space.toStandard(
                    orgSlug,
                    spaceSlug,
                    d.standard.id,
                  )}
                >
                  {d.standard.name}
                </Link>
              </PMLink>
            ) : (
              <PMText variant="body-important">{d.standard.name}</PMText>
            )}
          </PMVStack>
        ),
        version: versionNode,
        status: statusNode,
      };
    });

  const skillRows: PMTableRow[] = filterItems([...skills])
    .sort((a, b) => a.skill.name.localeCompare(b.skill.name))
    .map((d) => {
      const versionNode =
        mode !== 'outdated' && d.isUpToDate ? (
          <PMBadge colorPalette="gray" size="sm">
            {d.deployedVersion.version}
          </PMBadge>
        ) : (
          <PMHStack gap={2} justify="center" align="center">
            <PMBadge colorPalette="gray" size="sm">
              {d.deployedVersion.version}
            </PMBadge>
            <PMText variant="small" color="faded">
              →
            </PMText>
            {(() => {
              const gap = d.latestVersion.version - d.deployedVersion.version;
              const palette = getGapPalette(gap);
              return (
                <PMBadge colorPalette={palette} size="sm">
                  {d.latestVersion.version}
                </PMBadge>
              );
            })()}
          </PMHStack>
        );

      let statusNode: React.ReactNode;
      if (d.isDeleted) {
        statusNode = (
          <PMBadge colorPalette="red" size="sm">
            Needs removal
          </PMBadge>
        );
      } else if (mode === 'outdated') {
        statusNode = (
          <PMBadge colorPalette="red" size="sm">
            Outdated
          </PMBadge>
        );
      } else {
        statusNode = d.isUpToDate ? (
          <PMBadge colorPalette="green" size="sm">
            Up-to-date
          </PMBadge>
        ) : (
          <PMBadge colorPalette="red" size="sm">
            Outdated
          </PMBadge>
        );
      }

      return {
        name: (
          <PMVStack align="start" gap={0}>
            <PMText variant="small" color="tertiary">
              Skill
            </PMText>
            {orgSlug && spaceSlug ? (
              <PMLink asChild>
                <Link
                  to={routes.space.toSkill(orgSlug, spaceSlug, d.skill.slug)}
                >
                  {d.skill.name}
                </Link>
              </PMLink>
            ) : (
              <PMText variant="body-important">{d.skill.name}</PMText>
            )}
          </PMVStack>
        ),
        version: versionNode,
        status: statusNode,
      };
    });

  const rows = [...standardRows, ...recipeRows, ...skillRows];
  const hasRows = rows.length > 0;

  return (
    <PMVStack
      align="stretch"
      width="full"
      gap={0}
      border={'solid 1px'}
      borderColor={'border.primary'}
      padding={2}
    >
      <PMBox>
        <PMBadge colorPalette="gray" size="xs" marginRight={2}>
          Target
        </PMBadge>
        <PMText variant="body-important">{target.name}</PMText>
      </PMBox>
      {hasRows ? (
        <PMTable columns={TABLE_COLUMNS} data={rows} size="sm" />
      ) : (
        <PMHStack gap={2} align="center" mt={4}>
          <PMIcon color={'green.500'}>
            <LuCircleCheckBig />
          </PMIcon>
          <PMText variant="body" color="faded">
            No artifacts distributed here
          </PMText>
        </PMHStack>
      )}
    </PMVStack>
  );
};
