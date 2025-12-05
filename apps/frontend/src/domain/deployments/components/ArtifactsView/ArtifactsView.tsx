import React, { useMemo } from 'react';
import { DeploymentStatsSummary } from '../DeploymentStatsSummary/DeploymentStatsSummary';
import {
  PMBadge,
  PMEmptyState,
  PMHeading,
  PMHStack,
  PMLink,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { Link } from 'react-router';
import {
  RecipeDeploymentStatus,
  StandardDeploymentStatus,
} from '@packmind/types';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { routes } from '../../../../shared/utils/routes';

type ArtifactStatus = 'all' | 'outdated' | 'up-to-date';

type ArtifactsViewProps = {
  recipes: ReadonlyArray<RecipeDeploymentStatus>;
  standards: ReadonlyArray<StandardDeploymentStatus>;
  searchTerm?: string;
  artifactStatusFilter?: ArtifactStatus;
  orgSlug?: string;
  artifactTypeFilter?: ArtifactTypeFilter;
};

type EmptyState = { title: string; description: string } | null;

const getEmptyStateProps = (
  hasAnyArtifacts: boolean,
  searchTerm: string,
): EmptyState => {
  if (hasAnyArtifacts) return null;
  if (searchTerm) {
    return {
      title: 'No artifacts found',
      description: `No recipes or standards match your search "${searchTerm}"`,
    };
  }
  return {
    title: 'No artifacts',
    description: 'No recipes or standards were found in your organization',
  };
};

const getGapPalette = (gap: number): 'blue' | 'orange' | 'red' => {
  if (gap >= 10) return 'red';
  if (gap >= 5) return 'orange';
  return 'blue';
};

const TABLE_COLUMNS: PMTableColumn[] = [
  { key: 'repository', header: 'Repository', grow: true },
  { key: 'name', header: 'Target', grow: true },
  {
    key: 'version',
    header: 'Version (distributed → latest)',
    align: 'center',
    grow: true,
  },
  { key: 'status', header: 'Status', align: 'center' },
];

const filterAndSortDeployments = <
  T extends { isUpToDate: boolean; target: { name: string } },
>(
  deployments: ReadonlyArray<T> | undefined,
  artifactStatusFilter: ArtifactStatus,
): T[] => {
  return (deployments || [])
    .filter((td) => {
      if (artifactStatusFilter === 'all') return true;
      if (artifactStatusFilter === 'outdated') return !td.isUpToDate;
      return td.isUpToDate; // up-to-date
    })
    .sort((a, b) => a.target.name.localeCompare(b.target.name));
};

const renderStatusNode = (
  artifactStatusFilter: ArtifactStatus,
  upToDate: boolean,
) => {
  if (artifactStatusFilter === 'outdated') {
    return (
      <PMBadge colorPalette="red" size="sm">
        Outdated
      </PMBadge>
    );
  }
  return upToDate ? (
    <PMBadge colorPalette="green" size="sm">
      Up-to-date
    </PMBadge>
  ) : (
    <PMBadge colorPalette="red" size="sm">
      Outdated
    </PMBadge>
  );
};

const renderVersionNode = (
  artifactStatusFilter: ArtifactStatus,
  upToDate: boolean,
  deployedVersion: number,
  latestVersion: number,
) => {
  if (artifactStatusFilter !== 'outdated' && upToDate) {
    return (
      <PMBadge colorPalette="gray" size="sm">
        {deployedVersion}
      </PMBadge>
    );
  }

  const gap = latestVersion - deployedVersion;
  const palette = getGapPalette(gap);
  return (
    <PMHStack gap={2} justify="center" align="center">
      <PMBadge colorPalette="gray" size="sm">
        {deployedVersion}
      </PMBadge>
      <PMText variant="small" color="faded">
        →
      </PMText>
      <PMBadge colorPalette={palette} size="sm">
        {latestVersion}
      </PMBadge>
    </PMHStack>
  );
};

const formatRepoLabel = (td: {
  gitRepo: { owner: string; repo: string; branch?: string };
}) =>
  td.gitRepo.owner +
  '/' +
  td.gitRepo.repo +
  (td.gitRepo.branch ? ':' + td.gitRepo.branch : '');

const buildRecipeBlocks = (
  recipes: ReadonlyArray<RecipeDeploymentStatus>,
  artifactStatusFilter: ArtifactStatus,
  columns: PMTableColumn[],
  orgSlug?: string,
  spaceSlug?: string,
) =>
  recipes
    .map((recipe) => {
      const rows: PMTableRow[] = filterAndSortDeployments(
        recipe.targetDeployments,
        artifactStatusFilter,
      ).map((td) => {
        const upToDate = td.isUpToDate;
        const version = renderVersionNode(
          artifactStatusFilter,
          upToDate,
          td.deployedVersion.version,
          recipe.latestVersion.version,
        );
        const status = renderStatusNode(artifactStatusFilter, upToDate);
        const repoLabel = formatRepoLabel(td);

        return {
          name: <PMText variant="body-important">{td.target.name}</PMText>,
          repository: <PMText variant="body">{repoLabel}</PMText>,
          version,
          status,
        };
      });

      if (rows.length === 0) return null;

      return (
        <PMVStack
          key={`recipe-${recipe.recipe.id}`}
          align="stretch"
          backgroundColor={'blue.1000'}
          gap={4}
          borderRadius={'lg'}
          padding={6}
        >
          <PMHeading level="h3">
            {orgSlug && spaceSlug ? (
              <PMLink asChild color="text.primary">
                <Link
                  to={routes.space.toRecipe(
                    orgSlug,
                    spaceSlug,
                    recipe.recipe.id,
                  )}
                >
                  {recipe.recipe.name}
                </Link>
              </PMLink>
            ) : (
              recipe.recipe.name
            )}
          </PMHeading>
          <PMTable columns={columns} data={rows} size="sm" />
        </PMVStack>
      );
    })
    .filter((node): node is React.ReactElement => node !== null);

const buildStandardBlocks = (
  standards: ReadonlyArray<StandardDeploymentStatus>,
  artifactStatusFilter: ArtifactStatus,
  columns: PMTableColumn[],
  orgSlug?: string,
  spaceSlug?: string,
) =>
  standards
    .map((standard) => {
      const rows: PMTableRow[] = filterAndSortDeployments(
        standard.targetDeployments,
        artifactStatusFilter,
      ).map((td) => {
        const upToDate = td.isUpToDate;
        const version = renderVersionNode(
          artifactStatusFilter,
          upToDate,
          td.deployedVersion.version,
          standard.latestVersion.version,
        );
        const status = renderStatusNode(artifactStatusFilter, upToDate);
        const repoLabel = formatRepoLabel(td);

        return {
          name: <PMText variant="body-important">{td.target.name}</PMText>,
          repository: <PMText variant="body">{repoLabel}</PMText>,
          version,
          status,
        };
      });

      if (rows.length === 0) return null;

      return (
        <PMVStack
          key={`standard-${standard.standard.id}`}
          align="stretch"
          backgroundColor={'blue.1000'}
          gap={4}
          borderRadius={'lg'}
          padding={6}
        >
          <PMHeading level="h3">
            {orgSlug && spaceSlug ? (
              <PMLink asChild color="text.primary">
                <Link
                  to={routes.space.toStandard(
                    orgSlug,
                    spaceSlug,
                    standard.standard.id,
                  )}
                >
                  {standard.standard.name}
                </Link>
              </PMLink>
            ) : (
              standard.standard.name
            )}
          </PMHeading>
          <PMTable columns={columns} data={rows} size="sm" />
        </PMVStack>
      );
    })
    .filter((node): node is React.ReactElement => node !== null);

export type ArtifactTypeFilter = 'all' | 'recipes' | 'standards';

export const ArtifactsView: React.FC<ArtifactsViewProps> = ({
  recipes,
  standards,
  searchTerm = '',
  artifactStatusFilter = 'all',
  orgSlug,
  artifactTypeFilter = 'all',
}) => {
  const { spaceSlug } = useCurrentSpace();
  // Normalize search term once
  const normalizedSearch = searchTerm.trim().toLowerCase();

  // Filter artifacts by search on artifact name
  const filteredRecipes = useMemo(() => {
    const base = !normalizedSearch
      ? recipes
      : recipes.filter((r) =>
          r.recipe.name.toLowerCase().includes(normalizedSearch),
        );
    return [...base].sort((a, b) => a.recipe.name.localeCompare(b.recipe.name));
  }, [recipes, normalizedSearch]);

  const filteredStandards = useMemo(() => {
    const base = !normalizedSearch
      ? standards
      : standards.filter((s) =>
          s.standard.name.toLowerCase().includes(normalizedSearch),
        );
    return [...base].sort((a, b) =>
      a.standard.name.localeCompare(b.standard.name),
    );
  }, [standards, normalizedSearch]);

  // Build blocks before any early return to respect hooks order
  const recipeBlocks = useMemo(
    () =>
      buildRecipeBlocks(
        filteredRecipes,
        artifactStatusFilter,
        TABLE_COLUMNS,
        orgSlug,
        spaceSlug,
      ),
    [filteredRecipes, artifactStatusFilter, orgSlug, spaceSlug],
  );

  const standardBlocks = useMemo(
    () =>
      buildStandardBlocks(
        filteredStandards,
        artifactStatusFilter,
        TABLE_COLUMNS,
        orgSlug,
        spaceSlug,
      ),
    [filteredStandards, artifactStatusFilter, orgSlug, spaceSlug],
  );

  const visibleRecipes = useMemo(
    () =>
      artifactTypeFilter === 'all' || artifactTypeFilter === 'recipes'
        ? filteredRecipes
        : ([] as typeof filteredRecipes),
    [artifactTypeFilter, filteredRecipes],
  );
  const visibleStandards = useMemo(
    () =>
      artifactTypeFilter === 'all' || artifactTypeFilter === 'standards'
        ? filteredStandards
        : ([] as typeof filteredStandards),
    [artifactTypeFilter, filteredStandards],
  );

  const hasAnyArtifacts =
    (visibleRecipes?.length || 0) + (visibleStandards?.length || 0) > 0;
  const globalCounts = useMemo(() => {
    const totals = { upToDate: 0, outdated: 0 };
    visibleRecipes.forEach((recipe) => {
      (recipe.targetDeployments || []).forEach((td) => {
        if (td.isUpToDate) totals.upToDate += 1;
        else totals.outdated += 1;
      });
    });
    visibleStandards.forEach((standard) => {
      (standard.targetDeployments || []).forEach((td) => {
        if (td.isUpToDate) totals.upToDate += 1;
        else totals.outdated += 1;
      });
    });
    return totals;
  }, [visibleRecipes, visibleStandards]);

  const emptyState = getEmptyStateProps(hasAnyArtifacts, searchTerm);

  // recipeBlocks and standardBlocks are memoized above

  return (
    <PMVStack gap={4} align="stretch">
      <DeploymentStatsSummary counts={globalCounts} />
      {emptyState && (
        <PMEmptyState
          title={emptyState.title}
          description={emptyState.description}
        />
      )}
      {(artifactTypeFilter === 'all' || artifactTypeFilter === 'recipes') &&
        recipeBlocks.length > 0 && (
          <PMVStack gap={3} align="stretch">
            <PMHeading level="h5">Recipes</PMHeading>
            {recipeBlocks}
          </PMVStack>
        )}
      {(artifactTypeFilter === 'all' || artifactTypeFilter === 'standards') &&
        standardBlocks.length > 0 && (
          <PMVStack gap={3} align="stretch">
            <PMHeading level="h5">Standards</PMHeading>
            {standardBlocks}
          </PMVStack>
        )}
    </PMVStack>
  );
};
