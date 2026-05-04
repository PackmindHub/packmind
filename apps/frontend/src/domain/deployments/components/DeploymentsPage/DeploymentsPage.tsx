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
import { DeploymentsBlankState } from '../DeploymentsBlankState';
import { ArtifactsView } from '../ArtifactsView';
import type { ArtifactTypeFilter } from '../ArtifactsView/ArtifactsView';
import { TargetMultiSelect } from '../TargetMultiSelect';
import { RepositoryMultiSelect } from '../RepositoryMultiSelect';
import { StatusCombobox, type RepositoryStatus } from '../StatusCombobox';
import { useListActiveDistributedPackagesBySpaceQuery } from '../../api/queries/DeploymentsQueries';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { ActiveDistributedPackagesByTarget, Target } from '@packmind/types';
import { buildArtifactRollups } from '../../utils/buildArtifactRollups';

type ViewMode = 'repositories' | 'artifacts';

const extractAvailableTargets = (
  entries: ReadonlyArray<ActiveDistributedPackagesByTarget>,
): Target[] => {
  const targetMap = new Map<string, Target>();
  entries.forEach((entry) => {
    targetMap.set(entry.target.id, entry.target);
  });
  return Array.from(targetMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
};

const extractAvailableRepositories = (
  entries: ReadonlyArray<ActiveDistributedPackagesByTarget>,
) => {
  const map = new Map<
    string,
    { id: string; owner: string; repo: string; branch?: string | null }
  >();
  entries.forEach((entry) => {
    if (!entry.gitRepo) return;
    if (!map.has(entry.gitRepo.id)) map.set(entry.gitRepo.id, entry.gitRepo);
  });
  return Array.from(map.values()).sort((a, b) =>
    (a.owner + '/' + a.repo).localeCompare(b.owner + '/' + b.repo),
  );
};

export const DeploymentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { orgSlug } = useParams() as { orgSlug?: string };
  const { spaceId } = useCurrentSpace();

  // URL-synchronized state for viewMode
  const rawView = searchParams.get('view');
  const viewMode: ViewMode =
    rawView === 'repositories' || rawView === 'artifacts'
      ? (rawView as ViewMode)
      : 'repositories';
  const setViewMode = (newViewMode: ViewMode) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('view', newViewMode);
      newParams.delete('search');
      newParams.set('repoStatus', 'all');

      if (newViewMode === 'repositories') {
        newParams.delete('artType');
        newParams.delete('repoIds');
        newParams.delete('targetFilter');
      } else if (newViewMode === 'artifacts') {
        newParams.delete('repoIds');
        newParams.delete('targetFilter');
        newParams.set('artType', 'all');
      }

      return newParams;
    });
  };

  // Debounced search term
  const urlSearchTerm = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(urlSearchTerm);

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

  useEffect(() => {
    setSearchTerm(urlSearchTerm);
  }, [urlSearchTerm]);

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

  const rawTargetFilter = searchParams.get('targetFilter');
  const selectedTargetNames: string[] = useMemo(
    () => (rawTargetFilter ? rawTargetFilter.split(',') : []),
    [rawTargetFilter],
  );

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
    data: overviewData,
    isLoading,
    error,
  } = useListActiveDistributedPackagesBySpaceQuery(spaceId);
  const entries = useMemo(() => overviewData ?? [], [overviewData]);

  const availableTargets = useMemo(
    () => extractAvailableTargets(entries),
    [entries],
  );

  const availableRepositories = useMemo(
    () => extractAvailableRepositories(entries),
    [entries],
  );

  const artifactRollups = useMemo(
    () => buildArtifactRollups(entries),
    [entries],
  );

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
      const validTargetNames = Array.from(
        new Set(
          selectedTargetNames.filter((name) => availableTargetNames.has(name)),
        ),
      );
      if (validTargetNames.length !== selectedTargetNames.length) {
        setSelectedTargetNames(validTargetNames);
      }
    }
  }, [availableTargets, selectedTargetNames, setSelectedTargetNames]);

  if (isLoading) {
    return <PMText>Loading...</PMText>;
  }

  if (error) {
    return <PMText color="error">Error loading deployment data</PMText>;
  }

  if (!overviewData) {
    return <PMText>No deployment data available</PMText>;
  }

  if (entries.length === 0) {
    return <DeploymentsBlankState />;
  }

  let searchPlaceholder: string;
  if (viewMode === 'repositories') searchPlaceholder = 'Search repositories...';
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
        entries={entries}
        searchTerm={searchTerm}
        artifactStatusFilter={repositoryStatus}
        selectedTargetNames={selectedTargetNames}
        orgSlug={orgSlug}
        selectedRepoIds={selectedRepoIds}
      />
    </PMVStack>
  );

  const rawArtType = searchParams.get('artType');
  const artifactTypeFilter: ArtifactTypeFilter =
    rawArtType === 'all' ||
    rawArtType === 'commands' ||
    rawArtType === 'standards' ||
    rawArtType === 'skills'
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
              e.value === 'commands' ||
              e.value === 'standards' ||
              e.value === 'skills'
            )
              setArtifactTypeFilter(e.value as ArtifactTypeFilter);
          }}
        >
          <PMSegmentGroup.Indicator />
          <PMSegmentGroup.Items
            items={[
              { label: 'All', value: 'all' },
              { label: 'Commands', value: 'commands' },
              { label: 'Standards', value: 'standards' },
              { label: 'Skills', value: 'skills' },
            ]}
          />
        </PMSegmentGroup.Root>
      </PMHStack>
      <ArtifactsView
        recipes={artifactRollups.recipes}
        standards={artifactRollups.standards}
        skills={artifactRollups.skills}
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
