import React, { useEffect } from 'react';
import {
  PMBadge,
  PMBox,
  PMButton,
  PMCloseButton,
  PMDialog,
  PMHeading,
  PMHStack,
  PMIcon,
  PMLink,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMText,
  PMVStack,
  PMPortal,
} from '@packmind/ui';
import { Link } from 'react-router';
import { LuCircleCheckBig } from 'react-icons/lu';
import {
  TargetId,
  DeployedRecipeTargetInfo,
  DeployedStandardTargetInfo,
} from '@packmind/shared';
import {
  RunDistribution,
  useRunDistribution,
} from '../RunDistribution/RunDistribution';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { routes } from '../../../../shared/utils/routes';

export type RepositoryTargetTableProps = {
  orgSlug?: string;
  target: { id: TargetId; name: string; path?: string };
  recipes: ReadonlyArray<DeployedRecipeTargetInfo>;
  standards: ReadonlyArray<DeployedStandardTargetInfo>;
  mode?: 'all' | 'outdated' | 'up-to-date';
};

const TABLE_COLUMNS: PMTableColumn[] = [
  { key: 'name', header: 'Name', grow: true },
  {
    key: 'version',
    header: 'Version (deployed → latest)',
    align: 'center',
    grow: true,
  },
  { key: 'status', header: 'Status', align: 'center' },
  { key: 'action', header: 'Action', align: 'center' },
];

const getGapPalette = (gap: number): 'blue' | 'orange' | 'red' => {
  if (gap >= 10) return 'red';
  if (gap >= 5) return 'orange';
  return 'blue';
};

const PreselectTarget: React.FC<{ targetId: TargetId }> = ({ targetId }) => {
  const { setSelectedTargetIds } = useRunDistribution();
  useEffect(() => {
    setSelectedTargetIds([targetId]);
  }, [setSelectedTargetIds, targetId]);
  return null;
};

const UpdateDialogAction: React.FC<{
  targetId: TargetId;
  recipe?: DeployedRecipeTargetInfo['recipe'];
  standard?: DeployedStandardTargetInfo['standard'];
}> = ({ targetId, recipe, standard }) => {
  return (
    <PMDialog.Root
      size="md"
      placement="center"
      motionPreset="slide-in-bottom"
      scrollBehavior={'outside'}
    >
      <PMDialog.Trigger asChild>
        <PMButton size="xs" variant="secondary">
          Update
        </PMButton>
      </PMDialog.Trigger>
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Context>
              {(store) => (
                <RunDistribution
                  selectedRecipes={recipe ? [recipe] : []}
                  selectedStandards={standard ? [standard] : []}
                  onDistributionComplete={() => store.setOpen(false)}
                >
                  <PMDialog.Header>
                    <PMDialog.Title asChild>
                      <PMHeading level="h6">Deploy to targets</PMHeading>
                    </PMDialog.Title>
                    <PMDialog.CloseTrigger asChild>
                      <PMCloseButton size="sm" />
                    </PMDialog.CloseTrigger>
                  </PMDialog.Header>

                  <PMDialog.Body>
                    <PreselectTarget targetId={targetId} />
                    <RunDistribution.Body />
                  </PMDialog.Body>

                  <PMDialog.Footer>
                    <PMDialog.Trigger asChild>
                      <PMButton variant="tertiary" size="sm">
                        Cancel
                      </PMButton>
                    </PMDialog.Trigger>
                    <RunDistribution.Cta />
                  </PMDialog.Footer>
                </RunDistribution>
              )}
            </PMDialog.Context>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
};

export const RepositoryTargetTable: React.FC<RepositoryTargetTableProps> = ({
  orgSlug,
  target,
  recipes,
  standards,
  mode = 'all',
}) => {
  const { spaceSlug } = useCurrentSpace();

  const filterItems = <T extends { isUpToDate: boolean }>(items: T[]) => {
    if (mode === 'outdated') return items.filter((i) => !i.isUpToDate);
    if (mode === 'up-to-date') return items.filter((i) => i.isUpToDate);
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
      if (mode === 'outdated') {
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

      const actionNode =
        d.isUpToDate && mode !== 'outdated' ? (
          <PMText variant="small" color="tertiary">
            –
          </PMText>
        ) : (
          <UpdateDialogAction targetId={target.id} recipe={d.recipe} />
        );

      return {
        name: (
          <PMVStack align="start" gap={0}>
            <PMText variant="small" color="tertiary">
              Recipe
            </PMText>
            {orgSlug && spaceSlug ? (
              <PMLink asChild>
                <Link
                  to={routes.space.toRecipe(orgSlug, spaceSlug, d.recipe.id)}
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
        action: actionNode,
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
      if (mode === 'outdated') {
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

      const actionNode =
        d.isUpToDate && mode !== 'outdated' ? (
          <PMText variant="small" color="tertiary">
            –
          </PMText>
        ) : (
          <UpdateDialogAction targetId={target.id} standard={d.standard} />
        );

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
        action: actionNode,
      };
    });

  const rows = [...standardRows, ...recipeRows];
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
            No recipes or standards deployed here
          </PMText>
        </PMHStack>
      )}
    </PMVStack>
  );
};
