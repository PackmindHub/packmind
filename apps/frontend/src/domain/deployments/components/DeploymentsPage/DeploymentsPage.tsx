import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import {
  PMHStack,
  PMText,
  PMVStack,
  PMInput,
  PMNativeSelect,
  PMTabs,
} from '@packmind/ui';
import { RepositoryCentricView } from '../RepositoryCentricView';
import { RecipeCentricView } from '../RecipeCentricView';
import { StandardCentricView } from '../StandardCentricView';
import { TargetMultiSelect } from '../TargetMultiSelect';
import {
  useGetRecipesDeploymentOverviewQuery,
  useGetStandardsDeploymentOverviewQuery,
} from '../../api/queries/DeploymentsQueries';
import { Target } from '@packmind/shared';
import {
  TargetDeploymentStatus,
  TargetStandardDeploymentStatus,
} from '@packmind/shared';

type ViewMode = 'repositories' | 'recipes' | 'standards';
type RepositoryFilter = 'all' | 'outdated';
type RecipeFilter = 'all' | 'outdated' | 'undeployed';
type StandardFilter = 'all' | 'outdated' | 'undeployed';

/**
 * Extracts unique targets from deployment data for filtering purposes
 */
const extractAvailableTargets = (
  recipeTargets: TargetDeploymentStatus[] = [],
  standardTargets: TargetStandardDeploymentStatus[] = [],
): Target[] => {
  const targetMap = new Map<string, Target>();

  // Add targets from recipe deployments
  recipeTargets.forEach((targetDeployment) => {
    targetMap.set(targetDeployment.target.id, targetDeployment.target);
  });

  // Add targets from standard deployments
  standardTargets.forEach((targetDeployment) => {
    targetMap.set(targetDeployment.target.id, targetDeployment.target);
  });

  return Array.from(targetMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
};

export const DeploymentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-synchronized state for viewMode
  const rawView = searchParams.get('view');
  const viewMode: ViewMode =
    rawView === 'repositories' ||
    rawView === 'recipes' ||
    rawView === 'standards'
      ? rawView
      : 'repositories';
  const setViewMode = (newViewMode: ViewMode) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('view', newViewMode);
      return newParams;
    });
  };

  // Debounced search term implementation
  const urlSearchTerm = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(urlSearchTerm);

  // Debounce search term updates to URL (500ms delay)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        if (searchTerm) {
          newParams.set('search', searchTerm);
        } else {
          newParams.delete('search');
        }
        return newParams;
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, setSearchParams]);

  // Sync local state with URL when URL changes (e.g., browser back/forward)
  useEffect(() => {
    setSearchTerm(urlSearchTerm);
  }, [urlSearchTerm]);

  // URL-synchronized state for repositoryFilter
  const rawRepoFilter = searchParams.get('repoFilter');
  const repositoryFilter: RepositoryFilter =
    rawRepoFilter === 'all' || rawRepoFilter === 'outdated'
      ? rawRepoFilter
      : 'all';
  const setRepositoryFilter = (newRepositoryFilter: RepositoryFilter) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('repoFilter', newRepositoryFilter);
      return newParams;
    });
  };

  // URL-synchronized state for recipeFilter
  const rawRecipeFilter = searchParams.get('recipeFilter');
  const recipeFilter: RecipeFilter =
    rawRecipeFilter === 'all' ||
    rawRecipeFilter === 'outdated' ||
    rawRecipeFilter === 'undeployed'
      ? rawRecipeFilter
      : 'all';
  const setRecipeFilter = (newRecipeFilter: RecipeFilter) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('recipeFilter', newRecipeFilter);
      return newParams;
    });
  };

  // URL-synchronized state for standardFilter
  const rawStandardFilter = searchParams.get('standardFilter');
  const standardFilter: StandardFilter =
    rawStandardFilter === 'all' ||
    rawStandardFilter === 'outdated' ||
    rawStandardFilter === 'undeployed'
      ? rawStandardFilter
      : 'all';
  const setStandardFilter = (newStandardFilter: StandardFilter) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('standardFilter', newStandardFilter);
      return newParams;
    });
  };

  // URL-synchronized state for targetFilter (comma-separated target names)
  const rawTargetFilter = searchParams.get('targetFilter');
  const selectedTargetNames: string[] = rawTargetFilter
    ? rawTargetFilter.split(',')
    : [];
  const setSelectedTargetNames = (targetNames: string[]) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (targetNames.length > 0) {
        newParams.set('targetFilter', targetNames.join(','));
      } else {
        newParams.delete('targetFilter');
      }
      return newParams;
    });
  };

  const {
    data: recipesData,
    isLoading,
    error,
  } = useGetRecipesDeploymentOverviewQuery();
  const {
    data: standardData,
    isLoading: standardIsLoading,
    error: standardError,
  } = useGetStandardsDeploymentOverviewQuery();

  // Extract available targets for filtering (safe to call even when data is loading)
  const availableTargets = extractAvailableTargets(
    recipesData?.targets,
    standardData?.targets,
  );

  // Automatic cleanup of invalid target names when data updates
  useEffect(() => {
    if (selectedTargetNames.length > 0 && availableTargets.length > 0) {
      const availableTargetNames = new Set(
        availableTargets.map((target) => target.name),
      );
      // Keep only valid names and deduplicate
      const validTargetNames = Array.from(
        new Set(
          selectedTargetNames.filter((name) => availableTargetNames.has(name)),
        ),
      );

      // If some selected targets are no longer available, update the selection
      if (validTargetNames.length !== selectedTargetNames.length) {
        setSelectedTargetNames(validTargetNames);
      }
    }
  }, [availableTargets, selectedTargetNames, setSelectedTargetNames]);

  if (isLoading || standardIsLoading) {
    return <PMText>Loading...</PMText>;
  }

  if (error || standardError) {
    return <PMText color="error">Error loading deployment data</PMText>;
  }

  if (!recipesData) {
    return <PMText>No deployment data available</PMText>;
  }

  const searchField = (
    <PMInput
      id="deployment-search"
      placeholder={
        viewMode === 'repositories'
          ? 'Search repositories...'
          : viewMode === 'recipes'
            ? 'Search recipes...'
            : 'Search standards...'
      }
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      width="300px"
    />
  );

  const renderRepositoriesView = () => (
    <PMVStack gap={4} marginTop={4} align={'stretch'}>
      <PMHStack gap={4}>
        {searchField}
        <TargetMultiSelect
          availableTargets={availableTargets}
          selectedTargetNames={selectedTargetNames}
          onSelectionChange={setSelectedTargetNames}
          placeholder="Filter by targets..."
        />
        <PMNativeSelect
          value={repositoryFilter}
          items={[
            { label: 'All targets', value: 'all' },
            { label: 'Only outdated targets', value: 'outdated' },
          ]}
          onChange={(e) =>
            setRepositoryFilter(e.target.value as RepositoryFilter)
          }
        />
      </PMHStack>
      <RepositoryCentricView
        recipeRepositories={recipesData.repositories}
        standardRepositories={standardData?.repositories}
        recipeTargets={recipesData.targets}
        standardTargets={standardData?.targets}
        searchTerm={searchTerm}
        showOnlyOutdated={repositoryFilter === 'outdated'}
        selectedTargetNames={selectedTargetNames}
      />
    </PMVStack>
  );

  const renderRecipesView = () => (
    <PMVStack gap={4} marginTop={4} align={'stretch'}>
      <PMHStack gap={4}>
        {searchField}
        <PMNativeSelect
          value={recipeFilter}
          onChange={(e) => setRecipeFilter(e.target.value as RecipeFilter)}
          items={[
            { label: 'All recipes', value: 'all' },
            { label: 'Outdated recipes', value: 'outdated' },
            { label: 'Undeployed recipes', value: 'undeployed' },
          ]}
        />
      </PMHStack>
      <RecipeCentricView
        recipes={recipesData.recipes}
        searchTerm={searchTerm}
        showOnlyOutdated={recipeFilter === 'outdated'}
        showOnlyUndeployed={recipeFilter === 'undeployed'}
      />
    </PMVStack>
  );

  const renderStandardView = () => (
    <PMVStack gap={4} marginTop={4} align={'stretch'}>
      <PMHStack gap={4}>
        {searchField}
        <PMNativeSelect
          value={standardFilter}
          onChange={(e) => setStandardFilter(e.target.value as StandardFilter)}
          items={[
            { label: 'All standards', value: 'all' },
            { label: 'Outdated standards', value: 'outdated' },
            { label: 'Undeployed standards', value: 'undeployed' },
          ]}
        />
      </PMHStack>
      {standardData && (
        <StandardCentricView
          standards={standardData.standards}
          searchTerm={searchTerm}
          showOnlyOutdated={standardFilter === 'outdated'}
          showOnlyUndeployed={standardFilter === 'undeployed'}
        />
      )}
    </PMVStack>
  );

  return (
    <PMTabs
      defaultValue={viewMode}
      onValueChange={(e: { value: string }) => setViewMode(e.value as ViewMode)}
      lazyMount
      unmountOnExit
      tabs={[
        {
          value: 'repositories',
          triggerLabel: 'Repositories',
          content: renderRepositoriesView(),
        },
        {
          value: 'recipes',
          triggerLabel: 'Recipes',
          content: renderRecipesView(),
        },
        {
          value: 'standards',
          triggerLabel: 'Standards',
          content: renderStandardView(),
        },
      ]}
    />
  );
};
