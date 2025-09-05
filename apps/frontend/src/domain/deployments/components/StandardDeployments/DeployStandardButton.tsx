import React, { useCallback, useMemo } from 'react';
import {
  PMPopover,
  PMButton,
  PMBox,
  PMVStack,
  PMHStack,
  PMText,
} from '@packmind/ui';
import { useGetGitReposQuery } from '../../../git/api/queries';
import { GitRepoId } from '@packmind/git/types';

export interface DeployStandardButtonProps {
  /** Label for the deploy button */
  label?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button is in loading state */
  loading?: boolean;
  /** Callback when deploying to repositories */
  onDeploy: (repositoryIds: GitRepoId[]) => void;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Button variant */
  variant?: 'solid' | 'outline' | 'ghost';
  /** Button color scheme */
  colorScheme?: string;
  /** Custom className for styling */
  className?: string;
}

export const DeployStandardButton: React.FC<DeployStandardButtonProps> = ({
  label = 'Deploy',
  disabled = false,
  loading = false,
  onDeploy,
  size = 'md',
}) => {
  const {
    data: repositories = [],
    isLoading: repositoriesLoading,
    isError: repositoriesError,
  } = useGetGitReposQuery();

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

  const popoverContent = useMemo(
    () => (
      <PMBox>
        {repositoriesError && (
          <PMBox
            mb={3}
            p={2}
            bg="red.50"
            borderRadius="md"
            borderColor="red.200"
            borderWidth="1px"
          >
            <PMText fontSize="sm" color="error">
              Failed to load repositories
            </PMText>
          </PMBox>
        )}

        {repositoriesLoading && (
          <PMBox mb={3} p={2} bg="blue.50" borderRadius="md">
            <PMText fontSize="sm" color="primary">
              Loading repositories...
            </PMText>
          </PMBox>
        )}

        <PMVStack align="stretch" gap={2} paddingY={2} marginTop={4}>
          {repositories.map((repository) => (
            <PMHStack
              key={repository.id}
              justify="space-between"
              align="flex-start"
              border={'solid 1px'}
              borderColor={'border.secondary'}
              padding={3}
            >
              <PMVStack align="flex-start" gap={0.5} flex={1}>
                <PMText fontWeight="medium" fontSize="sm">
                  {repository.owner}/{repository.repo}
                </PMText>
                <PMText fontSize="xs" textAlign="left">
                  Branch: {repository.branch}
                </PMText>
              </PMVStack>
              <PMButton
                size="sm"
                variant="tertiary"
                onClick={() => handleRepositoryDeploy(repository.id)}
                disabled={disabled || loading || repositoriesLoading}
              >
                Deploy
              </PMButton>
            </PMHStack>
          ))}
        </PMVStack>

        <PMBox marginTop={4}>
          <PMButton
            variant="outline"
            onClick={handleDeployAll}
            size="sm"
            disabled={
              disabled ||
              loading ||
              repositoriesLoading ||
              repositories.length === 0
            }
          >
            Deploy to All Repositories
          </PMButton>
        </PMBox>
      </PMBox>
    ),
    [
      repositories,
      repositoriesError,
      repositoriesLoading,
      disabled,
      loading,
      handleRepositoryDeploy,
      handleDeployAll,
    ],
  );

  return (
    <PMPopover
      content={popoverContent}
      placement="bottom-start"
      showArrow
      disabled={disabled || loading}
      title={'Select Repository'}
    >
      <PMButton
        size={size}
        variant={'primary'}
        disabled={disabled}
        loading={loading}
        loadingText={loading ? label : undefined}
      >
        {label}
      </PMButton>
    </PMPopover>
  );
};
