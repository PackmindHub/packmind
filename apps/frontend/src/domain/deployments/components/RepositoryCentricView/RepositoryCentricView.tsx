import React, { useMemo, useCallback } from 'react';
import { PMBox, PMHeading, PMVStack, PMEmptyState } from '@packmind/ui';
import { DeploymentStatsSummary } from '../DeploymentStatsSummary/DeploymentStatsSummary';
import {
  RepositoryStandardDeploymentStatus,
  DeployedStandardInfo,
} from '@packmind/types';
import { GitRepo } from '@packmind/types';
import {
  DeployedRecipeInfo,
  RepositoryDeploymentStatus,
  TargetDeploymentStatus,
  TargetStandardDeploymentStatus,
  TargetId,
} from '@packmind/types';
import { RepositoryTargetTable } from '../RepositoryTargetTable/RepositoryTargetTable';

interface CombinedRepositoryDeploymentStatus {
  gitRepo: GitRepo;
  deployedRecipes: DeployedRecipeInfo[];
  deployedStandards: DeployedStandardInfo[];
  hasOutdatedRecipes: boolean;
  hasOutdatedStandards: boolean;
  // Target-based grouping
  recipeTargets?: TargetDeploymentStatus[];
  standardTargets?: TargetStandardDeploymentStatus[];
}

interface RepositoryCentricViewProps {
  recipeRepositories: RepositoryDeploymentStatus[];
  standardRepositories?: RepositoryStandardDeploymentStatus[];
  recipeTargets?: TargetDeploymentStatus[];
  standardTargets?: TargetStandardDeploymentStatus[];
  searchTerm?: string;
  artifactStatusFilter?: ArtifactStatusFilter;
  selectedTargetNames?: string[];
  orgSlug?: string;
  selectedRepoIds?: string[];
}

type ArtifactStatusFilter = 'all' | 'outdated' | 'up-to-date';

type TargetEntryForRepo = {
  id: TargetId;
  name: string;
  recipes: DeployedRecipeInfo[];
  standards: DeployedStandardInfo[];
  hasContent: boolean;
  hasOutdated: boolean;
};

const getSortedTargetEntries = (
  repository: CombinedRepositoryDeploymentStatus,
  selectedTargetNames: string[] | undefined,
  artifactStatusFilter: ArtifactStatusFilter,
): TargetEntryForRepo[] => {
  const targetIds: TargetId[] = Array.from(
    new Set([
      ...(repository.recipeTargets?.map((t) => t.target.id) || []),
      ...(repository.standardTargets?.map((t) => t.target.id) || []),
    ] as TargetId[]),
  );

  const entries = targetIds
    .map((targetId) => {
      const recipeTarget = repository.recipeTargets?.find(
        (t) => t.target.id === targetId,
      );
      const standardTarget = repository.standardTargets?.find(
        (t) => t.target.id === targetId,
      );
      const target = recipeTarget?.target || standardTarget?.target;
      if (!target) return null;
      const name = target.name;
      const allRecipes = recipeTarget?.deployedRecipes || [];
      const allStandards = standardTarget?.deployedStandards || [];
      const hasContent =
        (allRecipes?.length || 0) + (allStandards?.length || 0) > 0;
      const hasOutdated =
        recipeTarget?.hasOutdatedRecipes ||
        false ||
        standardTarget?.hasOutdatedStandards ||
        false;
      return {
        id: targetId,
        name,
        recipes: allRecipes,
        standards: allStandards,
        hasContent,
        hasOutdated,
      } as TargetEntryForRepo | null;
    })
    .filter((t): t is TargetEntryForRepo => !!t && !!t.name)
    .filter((t) => {
      if (
        selectedTargetNames &&
        selectedTargetNames.length > 0 &&
        !selectedTargetNames.includes(t.name)
      ) {
        return false;
      }
      if (artifactStatusFilter === 'outdated' && !t.hasOutdated) {
        return false;
      }
      if (artifactStatusFilter === 'up-to-date') {
        const hasUpToDate =
          t.recipes?.some(
            (r) => (r as unknown as { isUpToDate: boolean }).isUpToDate,
          ) ||
          t.standards?.some(
            (s) => (s as unknown as { isUpToDate: boolean }).isUpToDate,
          );
        if (!hasUpToDate) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.hasContent !== b.hasContent) {
        return a.hasContent ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

  return entries;
};

// Build combined repositories map using target-based inputs
const buildCombinedRepositoriesFromTargets = (
  recipeTargets: TargetDeploymentStatus[],
  standardTargets: TargetStandardDeploymentStatus[],
): Map<string, CombinedRepositoryDeploymentStatus> => {
  const combined = new Map<string, CombinedRepositoryDeploymentStatus>();

  // Group recipe targets by repository
  recipeTargets.forEach((targetDeployment) => {
    const repoId = targetDeployment.gitRepo.id;
    const existingRepo = combined.get(repoId);

    if (existingRepo) {
      existingRepo.deployedRecipes.push(...targetDeployment.deployedRecipes);
      existingRepo.hasOutdatedRecipes =
        existingRepo.hasOutdatedRecipes || targetDeployment.hasOutdatedRecipes;
      existingRepo.recipeTargets = existingRepo.recipeTargets || [];
      existingRepo.recipeTargets.push(targetDeployment);
    } else {
      combined.set(repoId, {
        gitRepo: targetDeployment.gitRepo,
        deployedRecipes: [...targetDeployment.deployedRecipes],
        deployedStandards: [],
        hasOutdatedRecipes: targetDeployment.hasOutdatedRecipes,
        hasOutdatedStandards: false,
        recipeTargets: [targetDeployment],
        standardTargets: [],
      });
    }
  });

  // Group standard targets by repository
  standardTargets.forEach((targetDeployment) => {
    const repoId = targetDeployment.gitRepo.id;
    const existingRepo = combined.get(repoId);

    if (existingRepo) {
      existingRepo.deployedStandards.push(
        ...targetDeployment.deployedStandards,
      );
      existingRepo.hasOutdatedStandards =
        existingRepo.hasOutdatedStandards ||
        targetDeployment.hasOutdatedStandards;
      existingRepo.standardTargets = existingRepo.standardTargets || [];
      existingRepo.standardTargets.push(targetDeployment);
    } else {
      combined.set(repoId, {
        gitRepo: targetDeployment.gitRepo,
        deployedRecipes: [],
        deployedStandards: [...targetDeployment.deployedStandards],
        hasOutdatedRecipes: false,
        hasOutdatedStandards: targetDeployment.hasOutdatedStandards,
        recipeTargets: [],
        standardTargets: [targetDeployment],
      });
    }
  });

  return combined;
};

// Build combined repositories map using legacy repo-based inputs
const buildCombinedRepositoriesFromRepos = (
  recipeRepositories: RepositoryDeploymentStatus[],
  standardRepositories: RepositoryStandardDeploymentStatus[],
): Map<string, CombinedRepositoryDeploymentStatus> => {
  const combined = new Map<string, CombinedRepositoryDeploymentStatus>();

  recipeRepositories.forEach((repo) => {
    combined.set(repo.gitRepo.id, {
      gitRepo: repo.gitRepo,
      deployedRecipes: repo.deployedRecipes,
      deployedStandards: [],
      hasOutdatedRecipes: repo.hasOutdatedRecipes,
      hasOutdatedStandards: false,
    });
  });

  standardRepositories.forEach((repo) => {
    const existing = combined.get(repo.gitRepo.id);
    if (existing) {
      existing.deployedStandards = repo.deployedStandards;
      existing.hasOutdatedStandards = repo.hasOutdatedStandards;
    } else {
      combined.set(repo.gitRepo.id, {
        gitRepo: repo.gitRepo,
        deployedRecipes: [],
        deployedStandards: repo.deployedStandards,
        hasOutdatedRecipes: false,
        hasOutdatedStandards: repo.hasOutdatedStandards,
      });
    }
  });

  return combined;
};

const getVisibleTargets = (
  repository: CombinedRepositoryDeploymentStatus,
  selectedTargetNames?: string[],
) => {
  const withSelection = !!selectedTargetNames?.length;
  const visibleRecipeTargets = withSelection
    ? repository.recipeTargets?.filter(
        (t) => selectedTargetNames?.includes(t.target.name) ?? false,
      )
    : repository.recipeTargets;
  const visibleStandardTargets = withSelection
    ? repository.standardTargets?.filter(
        (t) => selectedTargetNames?.includes(t.target.name) ?? false,
      )
    : repository.standardTargets;
  return { visibleRecipeTargets, visibleStandardTargets };
};

type ArtifactCounts = { upToDate: number; outdated: number };

const computeArtifactCounts = (
  recipeTargets?: TargetDeploymentStatus[],
  standardTargets?: TargetStandardDeploymentStatus[],
): ArtifactCounts => {
  const counts: ArtifactCounts = { upToDate: 0, outdated: 0 };

  (recipeTargets || []).forEach((t) => {
    (t.deployedRecipes || []).forEach((r) => {
      const isUp = (r as unknown as { isUpToDate?: boolean }).isUpToDate;
      if (isUp === true) counts.upToDate += 1;
      else if (isUp === false) counts.outdated += 1;
    });
  });

  (standardTargets || []).forEach((t) => {
    (t.deployedStandards || []).forEach((s) => {
      const isUp = (s as unknown as { isUpToDate?: boolean }).isUpToDate;
      if (isUp === true) counts.upToDate += 1;
      else if (isUp === false) counts.outdated += 1;
    });
  });

  return counts;
};

const hasVisibleStatusWithTargets = (
  repository: CombinedRepositoryDeploymentStatus,
  artifactStatusFilter: ArtifactStatusFilter,
  selectedTargetNames?: string[],
) => {
  if (artifactStatusFilter === 'all') return true;
  const { visibleRecipeTargets, visibleStandardTargets } = getVisibleTargets(
    repository,
    selectedTargetNames,
  );

  if (artifactStatusFilter === 'outdated') {
    return (
      visibleRecipeTargets?.some((t) => t.hasOutdatedRecipes) ||
      visibleStandardTargets?.some((t) => t.hasOutdatedStandards)
    );
  }

  // up-to-date
  const hasUpToDateInRecipes = visibleRecipeTargets?.some((t) =>
    t.deployedRecipes?.some(
      (r) => (r as unknown as { isUpToDate: boolean }).isUpToDate,
    ),
  );
  const hasUpToDateInStandards = visibleStandardTargets?.some((t) =>
    t.deployedStandards?.some(
      (s) => (s as unknown as { isUpToDate: boolean }).isUpToDate,
    ),
  );
  return Boolean(hasUpToDateInRecipes || hasUpToDateInStandards);
};

const hasVisibleStatusLegacy = (
  repository: CombinedRepositoryDeploymentStatus,
  artifactStatusFilter: ArtifactStatusFilter,
) => {
  if (artifactStatusFilter === 'all') return true;
  if (artifactStatusFilter === 'outdated') {
    return repository.hasOutdatedRecipes || repository.hasOutdatedStandards;
  }
  // up-to-date: has any deployments and none outdated
  const hasAny =
    (repository.deployedRecipes?.length || 0) > 0 ||
    (repository.deployedStandards?.length || 0) > 0;
  const hasAnyOutdated =
    repository.hasOutdatedRecipes || repository.hasOutdatedStandards;
  return hasAny && !hasAnyOutdated;
};

type EmptyState = { title: string; description: string } | null;

const getEmptyStateProps = (
  filteredCount: number,
  selectedTargetNames: string[] | undefined,
  searchTerm: string,
  artifactStatusFilter: ArtifactStatusFilter,
): EmptyState => {
  if (filteredCount > 0) return null;

  if (selectedTargetNames && selectedTargetNames.length > 0 && searchTerm) {
    return {
      title: 'No repositories found',
      description: `No repositories match your search "${searchTerm}" for the selected targets`,
    };
  }

  if (selectedTargetNames && selectedTargetNames.length > 0) {
    return {
      title: 'No repositories found',
      description: 'No repositories have deployments for the selected targets',
    };
  }

  if (searchTerm) {
    return {
      title: 'No repositories found',
      description: `No repositories match your search "${searchTerm}"`,
    };
  }

  if (artifactStatusFilter === 'outdated') {
    return {
      title: 'No outdated targets',
      description:
        'All targets have up-to-date recipes and standards distributed',
    };
  }

  if (artifactStatusFilter === 'up-to-date') {
    return {
      title: 'No up-to-date artifacts',
      description:
        'No recipes or standards are fully up-to-date for the current filters',
    };
  }

  return {
    title: 'No repositories',
    description: 'No repositories with distributed recipes or standards found',
  };
};

export const RepositoryCentricView: React.FC<RepositoryCentricViewProps> = ({
  recipeRepositories,
  standardRepositories = [],
  recipeTargets = [],
  standardTargets = [],
  searchTerm = '',
  artifactStatusFilter = 'all',
  selectedTargetNames = [],
  orgSlug,
  selectedRepoIds = [],
}) => {
  const shouldUseTargetData =
    recipeTargets.length > 0 || standardTargets.length > 0;

  const combinedRepositories = useMemo(() => {
    return shouldUseTargetData
      ? buildCombinedRepositoriesFromTargets(recipeTargets, standardTargets)
      : buildCombinedRepositoriesFromRepos(
          recipeRepositories,
          standardRepositories,
        );
  }, [
    shouldUseTargetData,
    recipeTargets,
    standardTargets,
    recipeRepositories,
    standardRepositories,
  ]);
  const hasAnySelectedTargetDeployments = useCallback(
    (repository: CombinedRepositoryDeploymentStatus) => {
      if (!selectedTargetNames || selectedTargetNames.length === 0) return true;
      return selectedTargetNames.some(
        (targetName) =>
          repository.recipeTargets?.some((t) => t.target.name === targetName) ||
          repository.standardTargets?.some((t) => t.target.name === targetName),
      );
    },
    [selectedTargetNames],
  );

  const matchesSearch = useCallback(
    (repository: CombinedRepositoryDeploymentStatus) => {
      if (!searchTerm) return true;
      const fullName =
        `${repository.gitRepo.owner}/${repository.gitRepo.repo}`.toLowerCase();
      return fullName.includes(searchTerm.toLowerCase());
    },
    [searchTerm],
  );

  const hasVisibleMatchingStatus = (
    repository: CombinedRepositoryDeploymentStatus,
  ) => {
    return shouldUseTargetData
      ? hasVisibleStatusWithTargets(
          repository,
          artifactStatusFilter,
          selectedTargetNames,
        )
      : hasVisibleStatusLegacy(repository, artifactStatusFilter);
  };

  const filteredRepositories = Array.from(combinedRepositories.values()).filter(
    (repository: CombinedRepositoryDeploymentStatus) =>
      (selectedRepoIds.length === 0 ||
        selectedRepoIds.includes(repository.gitRepo.id)) &&
      hasAnySelectedTargetDeployments(repository) &&
      matchesSearch(repository) &&
      hasVisibleMatchingStatus(repository),
  );

  const globalCounts = useMemo(() => {
    const totals: ArtifactCounts = { upToDate: 0, outdated: 0 };

    const add = (more: ArtifactCounts) => {
      totals.upToDate += more.upToDate;
      totals.outdated += more.outdated;
    };

    Array.from(combinedRepositories.values()).forEach((repository) => {
      if (
        (selectedRepoIds.length > 0 &&
          !selectedRepoIds.includes(repository.gitRepo.id)) ||
        !hasAnySelectedTargetDeployments(repository) ||
        !matchesSearch(repository)
      ) {
        return;
      }

      if (shouldUseTargetData) {
        const { visibleRecipeTargets, visibleStandardTargets } =
          getVisibleTargets(repository, selectedTargetNames);
        add(
          computeArtifactCounts(visibleRecipeTargets, visibleStandardTargets),
        );
      } else {
        const counts: ArtifactCounts = { upToDate: 0, outdated: 0 };
        (repository.deployedRecipes || []).forEach((r) => {
          const isUp = (r as unknown as { isUpToDate?: boolean }).isUpToDate;
          if (isUp === true) counts.upToDate += 1;
          else if (isUp === false) counts.outdated += 1;
        });
        (repository.deployedStandards || []).forEach((s) => {
          const isUp = (s as unknown as { isUpToDate?: boolean }).isUpToDate;
          if (isUp === true) counts.upToDate += 1;
          else if (isUp === false) counts.outdated += 1;
        });
        add(counts);
      }
    });

    return totals;
  }, [
    combinedRepositories,
    selectedRepoIds,
    selectedTargetNames,
    shouldUseTargetData,
    hasAnySelectedTargetDeployments,
    matchesSearch,
  ]);

  // Sort repositories: those with content first, then alphabetical by repo title
  const sortedRepositories = useMemo(() => {
    return [...filteredRepositories].sort((a, b) => {
      const aHas =
        (a.deployedRecipes?.length || 0) > 0 ||
        (a.deployedStandards?.length || 0) > 0;
      const bHas =
        (b.deployedRecipes?.length || 0) > 0 ||
        (b.deployedStandards?.length || 0) > 0;
      if (aHas !== bHas) return aHas ? -1 : 1;
      const aTitle =
        `${a.gitRepo.owner}/${a.gitRepo.repo}:${a.gitRepo.branch}`.toLowerCase();
      const bTitle =
        `${b.gitRepo.owner}/${b.gitRepo.repo}:${b.gitRepo.branch}`.toLowerCase();
      return aTitle.localeCompare(bTitle);
    });
  }, [filteredRepositories]);

  const emptyState = getEmptyStateProps(
    filteredRepositories.length,
    selectedTargetNames,
    searchTerm,
    artifactStatusFilter,
  );

  if (emptyState) {
    return (
      <PMEmptyState
        title={emptyState.title}
        description={emptyState.description}
      />
    );
  }

  return (
    <PMVStack gap={4} align="stretch">
      <DeploymentStatsSummary counts={globalCounts} />
      {sortedRepositories.map((repository) => {
        // Rendu uniquement basé sur les targets (legacy supprimé)
        const hasTargets =
          (repository.recipeTargets && repository.recipeTargets.length > 0) ||
          (repository.standardTargets && repository.standardTargets.length > 0);

        return (
          <PMVStack
            key={repository.gitRepo.id}
            align="stretch"
            backgroundColor={'blue.1000'}
            gap={4}
            borderRadius={'lg'}
            padding={6}
          >
            <PMHeading level="h5">
              {repository.gitRepo.owner}/{repository.gitRepo.repo}:
              {repository.gitRepo.branch}
            </PMHeading>

            <PMVStack align="stretch" width="full">
              {hasTargets && (
                // Target-based rendering via shared RepositoryTargetTable
                <>
                  {getSortedTargetEntries(
                    repository,
                    selectedTargetNames,
                    artifactStatusFilter,
                  ).map((t) => (
                    <RepositoryTargetTable
                      key={`target-${t.id}`}
                      orgSlug={orgSlug}
                      target={{ id: t.id, name: t.name }}
                      recipes={t.recipes}
                      standards={t.standards}
                      mode={artifactStatusFilter}
                    />
                  ))}
                </>
              )}
            </PMVStack>
          </PMVStack>
        );
      })}
    </PMVStack>
  );
};
