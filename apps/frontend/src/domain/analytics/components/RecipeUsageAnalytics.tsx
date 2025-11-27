import React from 'react';
import { PMBox, PMVStack, PMSpinner, PMText, PMTabs } from '@packmind/ui';
import {
  useGetRecipeUsageAnalyticsQuery,
  useGetRecipeUsageAnalyticsByRepositoryQuery,
  useGetUsageByTargetQuery,
} from '../api/queries/AnalyticsQueries';
import { useGetGitReposQuery } from '../../git/api/queries/GitRepoQueries';
import { useGetTargetsByRepositoryQuery } from '../../deployments/api/queries/DeploymentsQueries';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { GitRepoId, TargetId } from '@packmind/types';
import { useAnalyticsUrlState, ViewType } from '../hooks/useAnalyticsUrlState';
import { useAnalyticsTableData } from '../hooks/useAnalyticsTableData';
import { AnalyticsFilters } from './AnalyticsFilters';
import { AnalyticsContent } from './AnalyticsContent';

export const RecipeUsageAnalytics = () => {
  const { organization } = useAuthContext();

  // URL state management
  const {
    timePeriod,
    view,
    repository,
    target,
    setTimePeriod,
    setRepository,
    setTarget,
    setView,
    initializeUrlParams,
  } = useAnalyticsUrlState();

  // Initialize URL params on mount
  React.useEffect(() => {
    initializeUrlParams();
  }, [initializeUrlParams]);

  // Data fetching - organization level
  const {
    data: analyticsData,
    isLoading,
    isError,
  } = useGetRecipeUsageAnalyticsQuery(timePeriod);

  // Get repositories for selector
  const {
    data: repositories,
    isLoading: isRepositoriesLoading,
    isError: isRepositoriesError,
  } = useGetGitReposQuery();

  // Find the selected repository ID from the repositories list
  const selectedRepositoryId = React.useMemo(() => {
    if (!repository || !repositories) return undefined;
    const found = repositories.find(
      (repo) =>
        repo.owner === repository.owner && repo.repo === repository.repo,
    );
    return found?.id;
  }, [repository, repositories]);

  // Data fetching - repository level
  const {
    data: repositoryAnalyticsData,
    isLoading: isRepositoryLoading,
    isError: isRepositoryError,
  } = useGetRecipeUsageAnalyticsByRepositoryQuery(
    selectedRepositoryId as GitRepoId,
    timePeriod,
  );

  // Data fetching - target level
  const {
    data: targetAnalyticsData,
    isLoading: isTargetLoading,
    isError: isTargetError,
  } = useGetUsageByTargetQuery(target || undefined, timePeriod);

  // Get targets for selected repository
  const { data: targetsWithRepo, isLoading: isTargetsLoading } =
    useGetTargetsByRepositoryQuery(
      repository?.owner || '',
      repository?.repo || '',
    );

  // Repository options for selector (deduplicate by owner/repo)
  const repositoryOptions = React.useMemo(() => {
    if (!repositories) return [];
    const uniqueRepos = new Map<string, { owner: string; repo: string }>();
    repositories.forEach((repo) => {
      const displayKey = `${repo.owner}/${repo.repo}`;
      if (!uniqueRepos.has(displayKey)) {
        uniqueRepos.set(displayKey, { owner: repo.owner, repo: repo.repo });
      }
    });
    return Array.from(uniqueRepos.entries()).map(
      ([displayKey, { owner, repo }]) => ({
        value: `${owner}|||${repo}`,
        label: displayKey,
      }),
    );
  }, [repositories]);

  // Target options for selector
  const targetOptions = React.useMemo(() => {
    if (!targetsWithRepo || !repository) return [];
    return targetsWithRepo.map((targetWithRepo) => ({
      value: targetWithRepo.id,
      label: `${targetWithRepo.name} (${targetWithRepo.path}) - ${targetWithRepo.repository.branch}`,
    }));
  }, [targetsWithRepo, repository]);

  // Transform data for tables
  const organizationTableData = useAnalyticsTableData(
    analyticsData,
    organization?.slug,
  );
  const repositoryTableData = useAnalyticsTableData(
    repositoryAnalyticsData,
    organization?.slug,
  );
  const targetTableData = useAnalyticsTableData(
    targetAnalyticsData,
    organization?.slug,
  );

  // Handle select changes
  const handleRepositoryChange = React.useCallback(
    (repoKey: string) => {
      if (repoKey) {
        const [owner, repo] = repoKey.split('|||');
        setRepository(owner, repo);
      } else {
        setRepository(null, null);
      }
    },
    [setRepository],
  );

  const handleViewChange = React.useCallback(
    (newView: ViewType) => {
      setView(newView);
    },
    [setView],
  );

  const handleTargetChange = React.useCallback(
    (targetId: TargetId | null) => {
      setTarget(targetId);
    },
    [setTarget],
  );

  // Auto-select first repository when switching to repository or target view
  React.useEffect(() => {
    if (
      (view === 'repository' || view === 'target') &&
      !repository &&
      repositoryOptions.length > 0
    ) {
      const [owner, repo] = repositoryOptions[0].value.split('|||');
      setRepository(owner, repo);
    }
  }, [view, repository, repositoryOptions, setRepository]);

  // Auto-select first target when repository is selected
  React.useEffect(() => {
    if (
      view === 'target' &&
      repository &&
      !target &&
      targetOptions.length > 0
    ) {
      setTarget(targetOptions[0].value as TargetId);
    }
  }, [view, repository, target, targetOptions, setTarget]);

  // Loading state
  if (isLoading || isRepositoriesLoading) {
    return (
      <PMBox display="flex" justifyContent="center" py={8}>
        <PMVStack gap={4}>
          <PMSpinner size="lg" />
          <PMText>Loading recipe usage analytics...</PMText>
        </PMVStack>
      </PMBox>
    );
  }

  // Error state
  if (isError || isRepositoriesError) {
    return (
      <PMBox display="flex" justifyContent="center" py={8}>
        <PMText color="error">Error loading recipe usage analytics.</PMText>
      </PMBox>
    );
  }

  return (
    <PMTabs
      value={view}
      defaultValue="organization"
      onValueChange={(e) => handleViewChange(e.value as ViewType)}
      tabs={[
        {
          triggerLabel: 'Organization Level',
          value: 'organization',
          content: (
            <PMVStack gap={6} alignItems={'stretch'}>
              <AnalyticsFilters
                selectedTimePeriod={timePeriod}
                onTimePeriodChange={setTimePeriod}
              />
              <AnalyticsContent
                tableData={organizationTableData}
                isLoading={isLoading}
                isError={isError}
                loadingMessage="Loading organization analytics..."
                errorMessage="Error loading organization analytics."
              />
            </PMVStack>
          ),
        },
        {
          triggerLabel: 'Repository Level',
          value: 'repository',
          content: (
            <PMVStack gap={6} alignItems={'stretch'}>
              <AnalyticsFilters
                selectedTimePeriod={timePeriod}
                onTimePeriodChange={setTimePeriod}
                selectedRepository={
                  repository ? `${repository.owner}|||${repository.repo}` : null
                }
                onRepositoryChange={handleRepositoryChange}
                repositoryOptions={repositoryOptions}
              />
              <AnalyticsContent
                tableData={repositoryTableData}
                isLoading={isRepositoryLoading}
                isError={isRepositoryError}
                loadingMessage="Loading repository analytics..."
                errorMessage="Error loading repository analytics."
                emptyStateTitle={
                  !repository ? 'Select a Repository' : undefined
                }
                emptyStateDescription={
                  !repository
                    ? 'Choose a repository from the dropdown above to view recipe usage analytics for that specific repository.'
                    : undefined
                }
              />
            </PMVStack>
          ),
        },
        {
          triggerLabel: 'Target Level',
          value: 'target',
          content: (
            <PMVStack gap={6} alignItems={'stretch'}>
              <AnalyticsFilters
                selectedTimePeriod={timePeriod}
                onTimePeriodChange={setTimePeriod}
                selectedRepository={
                  repository ? `${repository.owner}|||${repository.repo}` : null
                }
                onRepositoryChange={handleRepositoryChange}
                repositoryOptions={repositoryOptions}
                selectedTarget={target}
                onTargetChange={handleTargetChange}
                targetOptions={targetOptions}
                isTargetsLoading={isTargetsLoading}
              />
              <AnalyticsContent
                tableData={targetTableData}
                isLoading={isTargetLoading}
                isError={isTargetError}
                loadingMessage="Loading target analytics..."
                errorMessage="Error loading target analytics."
                emptyStateTitle={
                  !repository
                    ? 'Select a Repository'
                    : !target
                      ? 'Select a Target'
                      : undefined
                }
                emptyStateDescription={
                  !repository
                    ? 'Choose a repository to view available targets.'
                    : !target
                      ? 'Choose a target from the dropdown to view usage analytics.'
                      : undefined
                }
              />
            </PMVStack>
          ),
        },
      ]}
    />
  );
};
