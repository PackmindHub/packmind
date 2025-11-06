import React, { useCallback, useMemo } from 'react';
import {
  PMAlert,
  PMButton,
  PMDataList,
  PMEmptyState,
  PMHeading,
  PMPageSection,
  PMSpinner,
  PMBox,
  PMVStack,
  PMHStack,
  PMText,
} from '@packmind/ui';

import { useGetGitReposQuery } from '../../../git/api/queries';
import { GitRepoId } from '@packmind/types';
import { Standard } from '@packmind/types';

export interface DeployToReposProps {
  disabled?: boolean;
  loading?: boolean;
  standard: Standard;
  onDeploy: (repositoryIds: GitRepoId[]) => void;
}

export const DeployToRepos: React.FC<DeployToReposProps> = ({
  disabled = false,
  loading = false,
  standard,
  onDeploy,
}) => {
  const {
    data: repositories = [],
    isLoading: repositoriesLoading,
    isError: repositoriesError,
  } = useGetGitReposQuery();

  const defaultPath = `.packmind/standards/${standard.slug}.md`;

  const handleRepositoryDeploy = useCallback(
    (repositoryId: GitRepoId) => {
      onDeploy([repositoryId]);
    },
    [onDeploy],
  );

  const handleDeployAll = useCallback(() => {
    if (repositories.length > 0) {
      onDeploy(repositories.map((repo) => repo.id));
    } else {
      console.warn('No repositories available for deployment');
    }
  }, [onDeploy, repositories]);

  const content = useMemo(
    () => (
      <PMBox w="100%">
        {repositoriesError && (
          <PMAlert.Root status="error" mb={3} p={2}>
            <PMAlert.Content>Failed to load repositories</PMAlert.Content>
          </PMAlert.Root>
        )}

        {repositoriesLoading && (
          <PMAlert.Root status="neutral" mb={3} p={2}>
            <PMAlert.Indicator>
              <PMSpinner size="sm" />
            </PMAlert.Indicator>
            <PMAlert.Content>Loading repositories...</PMAlert.Content>
          </PMAlert.Root>
        )}

        {repositories.length === 0 && !repositoriesLoading && (
          <PMEmptyState
            title={'No repositories connected'}
            description="Connect a Git repository to deploy changes."
          />
        )}

        <PMBox
          padding={4}
          border={'solid 1px'}
          borderColor="border.secondary"
          borderRadius="md"
          mb={6}
          mt={2}
        >
          <PMHeading level="h5">Target file information</PMHeading>
          <PMDataList
            my={2}
            flexDirection={'row'}
            size={'sm'}
            gap={6}
            items={[
              { label: 'Path', value: defaultPath },
              {
                label: 'Scope',
                value: (
                  <PMBox wordBreak="break-all">
                    {standard.scope || '**/*'}
                  </PMBox>
                ),
              },
            ]}
          />
        </PMBox>

        <PMVStack align="stretch" gap={2} my={2}>
          {repositories.map((repository) => (
            <PMHStack
              justify="space-between"
              align="flex-start"
              key={repository.id}
              p={3}
              border="1px solid"
              borderColor="border.secondary"
              borderRadius="md"
            >
              <PMVStack align="flex-start" gap={0.5} flex={1}>
                <PMText fontWeight="medium" fontSize="sm">
                  {repository.owner}/{repository.repo}:{repository.branch}
                </PMText>
              </PMVStack>
              <PMButton
                size="sm"
                variant="outline"
                onClick={() => handleRepositoryDeploy(repository.id)}
                disabled={disabled || loading || repositoriesLoading}
              >
                Deploy
              </PMButton>
            </PMHStack>
          ))}
        </PMVStack>
      </PMBox>
    ),
    [
      repositoriesError,
      repositoriesLoading,
      repositories,
      defaultPath,
      standard.scope,
      disabled,
      loading,
      handleRepositoryDeploy,
    ],
  );

  return (
    <PMPageSection
      title="Run deployment"
      backgroundColor="primary"
      headingLevel="h4"
      cta={
        <PMButton
          variant="secondary"
          onClick={handleDeployAll}
          disabled={
            disabled ||
            loading ||
            repositoriesLoading ||
            repositories.length === 0
          }
        >
          Deploy to All Repositories
        </PMButton>
      }
    >
      {content}
    </PMPageSection>
  );
};
