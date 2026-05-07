import React, { useMemo } from 'react';
import { PMHeading, PMVStack, PMEmptyState } from '@packmind/ui';
import { ActiveDistributedPackagesByTarget } from '@packmind/types';
import { RepositoryTargetTable } from '../RepositoryTargetTable/RepositoryTargetTable';
import {
  buildRepositorySections,
  RepoSection,
  TargetSection,
} from '../../utils/buildRepositorySections';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';

type ArtifactStatusFilter = 'all' | 'outdated' | 'up-to-date';

interface RepositoryCentricViewProps {
  entries: ReadonlyArray<ActiveDistributedPackagesByTarget>;
  searchTerm?: string;
  artifactStatusFilter?: ArtifactStatusFilter;
  selectedTargetNames?: string[];
  orgSlug?: string;
  selectedRepoIds?: string[];
}

const matchesStatus = (
  target: TargetSection,
  filter: ArtifactStatusFilter,
): boolean => {
  if (filter === 'outdated') return target.hasOutdated;
  if (filter === 'up-to-date') return target.inSyncCount > 0;
  return true;
};

const matchesTargetNames = (
  target: TargetSection,
  selectedNames: string[],
): boolean => {
  if (selectedNames.length === 0) return true;
  return selectedNames.includes(target.target.name);
};

const matchesSearch = (section: RepoSection, searchTerm: string): boolean => {
  if (!searchTerm) return true;
  const fullName =
    `${section.gitRepo.owner}/${section.gitRepo.repo}`.toLowerCase();
  return fullName.includes(searchTerm.toLowerCase());
};

type EmptyState = { title: string; description: string } | null;

const getEmptyStateProps = (
  visibleCount: number,
  totalSections: number,
  selectedTargetNames: string[],
  searchTerm: string,
  artifactStatusFilter: ArtifactStatusFilter,
): EmptyState => {
  if (visibleCount > 0) return null;

  if (totalSections === 0) {
    return {
      title: 'No distributions yet',
      description:
        'No recipes, standards, or skills have been distributed to repositories yet',
    };
  }

  if (searchTerm && selectedTargetNames.length > 0) {
    return {
      title: 'No repositories found',
      description: `No repositories match your search "${searchTerm}" for the selected targets`,
    };
  }

  if (selectedTargetNames.length > 0) {
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
  entries,
  searchTerm = '',
  artifactStatusFilter = 'all',
  selectedTargetNames = [],
  orgSlug,
  selectedRepoIds = [],
}) => {
  const { data: gitProvidersResponse, isLoading: isProvidersLoading } =
    useGetGitProvidersQuery();
  const providersWithToken = useMemo(() => {
    const set = new Set<string>();
    gitProvidersResponse?.providers
      .filter((provider) => provider.hasToken)
      .forEach((provider) => set.add(provider.id));
    return set;
  }, [gitProvidersResponse]);

  const sections = useMemo(
    () => buildRepositorySections({ entries }),
    [entries],
  );

  const visibleSections = useMemo(() => {
    return sections
      .filter(
        (section) =>
          (selectedRepoIds.length === 0 ||
            selectedRepoIds.includes(section.gitRepo.id)) &&
          matchesSearch(section, searchTerm),
      )
      .map((section) => ({
        ...section,
        targets: section.targets.filter(
          (t) =>
            matchesTargetNames(t, selectedTargetNames) &&
            matchesStatus(t, artifactStatusFilter),
        ),
      }))
      .filter((section) => section.targets.length > 0);
  }, [
    sections,
    selectedRepoIds,
    searchTerm,
    selectedTargetNames,
    artifactStatusFilter,
  ]);

  const emptyState = getEmptyStateProps(
    visibleSections.length,
    sections.length,
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
      {visibleSections.map((section) => (
        <PMVStack
          key={section.gitRepo.id}
          align="stretch"
          backgroundColor={'blue.1000'}
          gap={4}
          borderRadius={'lg'}
          padding={6}
        >
          <PMHeading level="h5">
            {section.gitRepo.owner}/{section.gitRepo.repo}:
            {section.gitRepo.branch}
          </PMHeading>

          <PMVStack align="stretch" width="full">
            {section.targets.map((target) => (
              <RepositoryTargetTable
                key={`target-${target.id}`}
                orgSlug={orgSlug}
                target={{ id: target.id, name: target.target.name }}
                packageGroups={target.packageGroups}
                mode={artifactStatusFilter}
                canDistributeFromApp={
                  !isProvidersLoading &&
                  providersWithToken.has(section.gitRepo.providerId)
                }
                isDistributeReadinessLoading={isProvidersLoading}
              />
            ))}
          </PMVStack>
        </PMVStack>
      ))}
    </PMVStack>
  );
};
