import React, { useCallback, useState } from 'react';
import {
  PMBox,
  PMVStack,
  PMText,
  PMButton,
  PMAlertDialog,
  PMHeading,
  PMAlert,
  PMHStack,
  PMEmptyState,
  PMSpinner,
} from '@packmind/ui';
import {
  useGetRepositoriesByProviderQuery,
  useRemoveRepositoryMutation,
} from '../../api/queries';
import { GitProviderUI, GitRepoUI } from '../../types/GitProviderTypes';
import { GIT_MESSAGES } from '../../constants/messages';
import { RepositorySelector } from './RepositorySelector';
import { extractErrorMessage } from '../../utils/errorUtils';

interface RepositoriesManagementProps {
  provider: GitProviderUI;
}

export const RepositoriesManagement: React.FC<RepositoriesManagementProps> = ({
  provider,
}) => {
  const {
    data: repositories,
    isLoading,
    isError,
    error,
  } = useGetRepositoriesByProviderQuery(provider.id);
  const removeRepositoryMutation = useRemoveRepositoryMutation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [repoToRemove, setRepoToRemove] = useState<GitRepoUI | null>(null);
  const [deleteAlert, setDeleteAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const confirmRemoveRepository = useCallback(async () => {
    if (!repoToRemove) return;
    try {
      await removeRepositoryMutation.mutateAsync({
        repoId: repoToRemove.id,
        providerId: provider.id,
      });
      setDeleteAlert({
        type: 'success',
        message: GIT_MESSAGES.success.repositoryRemoved,
      });
      setDeleteDialogOpen(false);
      setRepoToRemove(null);
      setTimeout(() => {
        setDeleteAlert(null);
      }, 3000);
    } catch (error) {
      setDeleteAlert({
        type: 'error',
        message: extractErrorMessage(
          error,
          GIT_MESSAGES.error.repositoryRemoveFailed,
        ),
      });
      setDeleteDialogOpen(false);
      setRepoToRemove(null);
    }
  }, [repoToRemove, provider.id, removeRepositoryMutation]);

  if (isLoading) {
    return <PMEmptyState icon={<PMSpinner />} title="Loading repositories" />;
  }

  if (isError) {
    return (
      <PMAlert.Root status="error">
        <PMAlert.Indicator />
        <PMAlert.Title>Error loading repositories</PMAlert.Title>
        <PMAlert.Description>Error: {error.message}</PMAlert.Description>
      </PMAlert.Root>
    );
  }

  return (
    <PMVStack gap={4} align="stretch" width="full">
      <PMBox
        border={'solid 1px'}
        borderColor={'border.tertiary'}
        borderRadius={'sm'}
        padding={4}
      >
        <PMHeading level="h6" color={'tertiary'}>
          Connected Repositories
        </PMHeading>
        {deleteAlert && (
          <PMAlert.Root status={deleteAlert.type} my={4} size={'sm'}>
            <PMAlert.Indicator />
            <PMAlert.Title>{deleteAlert.message}</PMAlert.Title>
          </PMAlert.Root>
        )}
        <PMVStack align="start" gap={2} mt={4}>
          {repositories && repositories.length > 0 ? (
            repositories.map((repo) => (
              <PMBox
                key={repo.repo}
                p={2}
                border="1px solid"
                borderColor={'gray.700'}
                width={'full'}
              >
                <PMHStack justifyContent={'space-between'}>
                  <PMVStack align="start" gap={1}>
                    <PMText variant="small-important">{repo.repo}</PMText>
                    <PMText variant="small" color="secondary">
                      {repo.owner}/{repo.repo} - {repo.branch}
                    </PMText>
                  </PMVStack>
                  <PMAlertDialog
                    trigger={
                      <PMButton
                        variant="outline"
                        size="xs"
                        loading={removeRepositoryMutation.isPending}
                      >
                        Remove
                      </PMButton>
                    }
                    title="Remove Repository"
                    message={GIT_MESSAGES.confirmation.removeRepository(
                      repo.owner,
                      repo.repo,
                    )}
                    confirmText="Remove"
                    cancelText="Cancel"
                    confirmColorScheme="red"
                    onConfirm={confirmRemoveRepository}
                    open={deleteDialogOpen && repoToRemove?.id === repo.id}
                    onOpenChange={(open) => {
                      if (open) {
                        setRepoToRemove(repo);
                        setDeleteDialogOpen(true);
                      } else {
                        setDeleteDialogOpen(false);
                        setRepoToRemove(null);
                      }
                    }}
                    isLoading={removeRepositoryMutation.isPending}
                  />
                </PMHStack>
              </PMBox>
            ))
          ) : (
            <PMEmptyState size={'sm'} title="No repositories connected yet" />
          )}
        </PMVStack>
      </PMBox>

      <PMBox
        border={'solid 1px'}
        borderColor={'border.tertiary'}
        borderRadius={'sm'}
        padding={4}
      >
        <PMHeading level="h6" color={'tertiary'}>
          Add Repository
        </PMHeading>
        <RepositorySelector provider={provider} />
      </PMBox>
    </PMVStack>
  );
};
