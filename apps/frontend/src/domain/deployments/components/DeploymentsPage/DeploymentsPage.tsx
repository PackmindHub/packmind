import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useParams } from 'react-router';
import {
  PMHStack,
  PMText,
  PMVStack,
  PMInput,
  PMTabs,
  PMSegmentGroup,
} from '@packmind/ui';
import { RepositoryCentricView } from '../RepositoryCentricView';
import { ArtifactsView } from '../ArtifactsView';
import type { ArtifactTypeFilter } from '../ArtifactsView/ArtifactsView';
import { TargetMultiSelect } from '../TargetMultiSelect';
import { RepositoryMultiSelect } from '../RepositoryMultiSelect';
import { StatusCombobox, type RepositoryStatus } from '../StatusCombobox';
import {
  useGetRecipesDeploymentOverviewQuery,
  useGetStandardsDeploymentOverviewQuery,
} from '../../api/queries/DeploymentsQueries';
import {
  Target,
  TargetDeploymentStatus,
  TargetStandardDeploymentStatus,
} from '@packmind/shared';

type ViewMode = 'repositories' | 'artifacts';

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

// StatusCombobox extracted to components/StatusCombobox

export const DeploymentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { orgSlug } = useParams() as { orgSlug?: string };

  // URL-synchronized state for viewMode
  const rawView = searchParams.get('view');
  const viewMode: ViewMode =
    rawView === 'repositories' || rawView === 'artifacts'
      ? (rawView as ViewMode)
      : 'repositories';
  const setViewMode = (newViewMode: ViewMode) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      // Always set new view first
      newParams.set('view', newViewMode);

      // Reset filters when switching views
      // Common resets
      newParams.delete('search'); // clear search box
      newParams.set('repoStatus', 'all'); // reset status filter

      if (newViewMode === 'repositories') {
        // Clear artifacts-specific filters
        newParams.delete('artType');
        // Keep repository-centric filters but reset selections
        newParams.delete('repoIds');
        newParams.delete('targetFilter');
      } else if (newViewMode === 'artifacts') {
        // Clear repository-centric selections
        newParams.delete('repoIds');
        newParams.delete('targetFilter');
        // Ensure artifact type is reset
        newParams.set('artType', 'all');
      }

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

  // URL-synchronized state for repository status filter
  const rawRepoStatus = searchParams.get('repoStatus');
  const repositoryStatus: RepositoryStatus =
    rawRepoStatus === 'all' ||
    rawRepoStatus === 'outdated' ||
    rawRepoStatus === 'up-to-date'
      ? (rawRepoStatus as RepositoryStatus)
      : 'all';
  const setRepositoryStatus = (newStatus: RepositoryStatus) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (newStatus === 'all') {
        newParams.delete('repoStatus');
      } else {
        newParams.set('repoStatus', newStatus);
      }
      return newParams;
    });
  };

  // Removed recipe/standard specific filters and views

  // URL-synchronized state for targetFilter (comma-separated target names)
  const rawTargetFilter = searchParams.get('targetFilter');
  const selectedTargetNames: string[] = useMemo(
    () => (rawTargetFilter ? rawTargetFilter.split(',') : []),
    [rawTargetFilter],
  );

  // URL-synchronized state for repository selection (comma-separated repo IDs)
  const rawRepoIds = searchParams.get('repoIds');
  const selectedRepoIds: string[] = useMemo(
    () => (rawRepoIds ? rawRepoIds.split(',') : []),
    [rawRepoIds],
  );
  const setSelectedRepoIds = useCallback(
    (repoIds: string[]) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        if (repoIds.length > 0) {
          newParams.set('repoIds', repoIds.join(','));
        } else {
          newParams.delete('repoIds');
        }
        return newParams;
      });
    },
    [setSearchParams],
  );
  const setSelectedTargetNames = useCallback(
    (targetNames: string[]) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        if (targetNames.length > 0) {
          newParams.set('targetFilter', targetNames.join(','));
        } else {
          newParams.delete('targetFilter');
        }
        return newParams;
      });
    },
    [setSearchParams],
  );

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

  // Filter targets by selected repositories (if any), then extract available targets
  const filteredRecipeTargets = useMemo(() => {
    const all = recipesData?.targets ?? [];
    if (!selectedRepoIds.length) return all;
    const selected = new Set(selectedRepoIds);
    return all.filter((t) => t.gitRepo && selected.has(t.gitRepo.id));
  }, [recipesData?.targets, selectedRepoIds]);

  const filteredStandardTargets = useMemo(() => {
    const all = standardData?.targets ?? [];
    if (!selectedRepoIds.length) return all;
    const selected = new Set(selectedRepoIds);
    return all.filter((t) => t.gitRepo && selected.has(t.gitRepo.id));
  }, [standardData?.targets, selectedRepoIds]);

  // Extract available targets for filtering (safe to call even when data is loading)
  const availableTargets = extractAvailableTargets(
    filteredRecipeTargets,
    filteredStandardTargets,
  );

  // Build available repositories list for combobox (from targets, since repository view is target-based)
  const availableRepositories = useMemo(() => {
    const map = new Map<
      string,
      { id: string; owner: string; repo: string; branch?: string | null }
    >();
    const add = (gitRepo?: {
      id: string;
      owner: string;
      repo: string;
      branch?: string | null;
    }) => {
      if (!gitRepo) return;
      if (!map.has(gitRepo.id)) map.set(gitRepo.id, gitRepo);
    };
    recipesData?.targets?.forEach((t) => add(t.gitRepo));
    standardData?.targets?.forEach((t) => add(t.gitRepo));
    return Array.from(map.values()).sort((a, b) =>
      (a.owner + '/' + a.repo).localeCompare(b.owner + '/' + b.repo),
    );
  }, [recipesData?.targets, standardData?.targets]);

  // Cleanup invalid selectedRepoIds when data updates
  useEffect(() => {
    if (selectedRepoIds.length > 0 && availableRepositories.length > 0) {
      const validIds = new Set(availableRepositories.map((r) => r.id));
      const filtered = Array.from(
        new Set(selectedRepoIds.filter((id) => validIds.has(id))),
      );
      if (filtered.length !== selectedRepoIds.length) {
        setSelectedRepoIds(filtered);
      }
    }
  }, [availableRepositories, selectedRepoIds, setSelectedRepoIds]);

  // Automatic cleanup of invalid target names when data or repo selection updates
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

  let searchPlaceholder: string;
  if (viewMode === 'repositories') searchPlaceholder = 'Search repositories...';
  // recipes/standards views removed
  else searchPlaceholder = 'Search artifacts...';

  const searchField = (
    <PMInput
      id="deployment-search"
      placeholder={searchPlaceholder}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      width="300px"
    />
  );

  const renderRepositoriesView = () => (
    <PMVStack gap={4} marginTop={4} align={'stretch'}>
      <PMHStack gap={4}>
        <RepositoryMultiSelect
          availableRepositories={availableRepositories}
          selectedRepoIds={selectedRepoIds}
          onSelectionChange={setSelectedRepoIds}
          placeholder="All repositories"
        />
        <TargetMultiSelect
          key={`tms-${availableTargets.map((t) => t.name).join('|')}`}
          availableTargets={availableTargets}
          selectedTargetNames={selectedTargetNames}
          onSelectionChange={setSelectedTargetNames}
          placeholder="All targets"
        />
        <StatusCombobox
          value={repositoryStatus}
          onChange={setRepositoryStatus}
        />
      </PMHStack>
      <RepositoryCentricView
        recipeRepositories={recipesData.repositories}
        standardRepositories={standardData?.repositories}
        recipeTargets={recipesData.targets}
        standardTargets={standardData?.targets}
        searchTerm={searchTerm}
        artifactStatusFilter={repositoryStatus}
        selectedTargetNames={selectedTargetNames}
        orgSlug={orgSlug}
        selectedRepoIds={selectedRepoIds}
      />
    </PMVStack>
  );

  // Removed recipe and standard views

  // URL-synchronized state for artifact type filter (artType)
  const rawArtType = searchParams.get('artType');
  const artifactTypeFilter: ArtifactTypeFilter =
    rawArtType === 'all' ||
    rawArtType === 'recipes' ||
    rawArtType === 'standards'
      ? (rawArtType as ArtifactTypeFilter)
      : 'all';
  const setArtifactTypeFilter = (newType: ArtifactTypeFilter) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('artType', newType);
      return newParams;
    });
  };

  const renderArtifactsView = () => (
    <PMVStack gap={4} marginTop={4} align={'stretch'}>
      <PMHStack gap={4}>
        {searchField}
        <StatusCombobox
          value={repositoryStatus}
          onChange={setRepositoryStatus}
        />
        <PMSegmentGroup.Root
          size="sm"
          marginLeft={'auto'}
          value={artifactTypeFilter}
          onValueChange={(e) => {
            if (
              e.value === 'all' ||
              e.value === 'recipes' ||
              e.value === 'standards'
            )
              setArtifactTypeFilter(e.value as ArtifactTypeFilter);
          }}
        >
          <PMSegmentGroup.Indicator />
          <PMSegmentGroup.Items
            items={[
              { label: 'All', value: 'all' },
              { label: 'Recipes', value: 'recipes' },
              { label: 'Standards', value: 'standards' },
            ]}
          />
        </PMSegmentGroup.Root>
      </PMHStack>
      <ArtifactsView
        recipes={recipesData.recipes}
        standards={standardData?.standards || []}
        searchTerm={searchTerm}
        artifactStatusFilter={repositoryStatus}
        orgSlug={orgSlug}
        artifactTypeFilter={artifactTypeFilter}
      />
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
          value: 'artifacts',
          triggerLabel: 'Artifacts',
          content: renderArtifactsView(),
        },
      ]}
    />
  );
};
