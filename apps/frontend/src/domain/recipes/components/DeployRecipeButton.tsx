import React, { useCallback, useMemo } from 'react';
import { PMPopover, PMButton, PMText } from '@packmind/ui';
import { PMBox, PMVStack, PMHStack } from '@packmind/ui';
import { useGetGitReposQuery } from '../../git/api/queries';
import { GitRepoId } from '@packmind/git/types';

export interface DeployRecipeButtonProps {
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

export const DeployRecipeButton: React.FC<DeployRecipeButtonProps> = ({
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
      <PMBox p={4} w="280px">
        <PMText mb={4}>Select Repository</PMText>

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

        <PMVStack align="stretch" gap={2} mb={4}>
          {repositories.map((repository) => (
            <PMBox
              key={repository.id}
              p={3}
              border="1px solid"
              borderColor="gray.200"
              borderRadius="md"
              _hover={{
                bg: 'gray.100',
              }}
            >
              <PMHStack justify="space-between" align="flex-start">
                <PMVStack align="flex-start" gap={0.5} flex={1}>
                  <PMText fontWeight="medium" fontSize="sm">
                    {repository.owner}/{repository.repo}
                  </PMText>
                  <PMText fontSize="xs" color="secondary" textAlign="left">
                    Branch: {repository.branch}
                  </PMText>
                </PMVStack>
                <PMButton
                  variant="primary"
                  onClick={() => handleRepositoryDeploy(repository.id)}
                  disabled={disabled || loading || repositoriesLoading}
                >
                  Deploy
                </PMButton>
              </PMHStack>
            </PMBox>
          ))}
        </PMVStack>

        <PMBox borderTop="1px solid" borderColor="gray.200" pt={3}>
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
