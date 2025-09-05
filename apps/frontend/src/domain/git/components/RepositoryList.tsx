import React, { useCallback, useMemo, useState } from 'react';
import {
  PMBox,
  PMHStack,
  PMBadge,
  PMVStack,
  PMButton,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMHeading,
  PMText,
  PMAlert,
  PMDialog,
  PMEmptyState,
} from '@packmind/ui';
import {
  useGetRepositoriesByProviderQuery,
  useRemoveRepositoryMutation,
} from '../api/queries';
import { GitProviderUI, GitRepoUI } from '../types/GitProviderTypes';
import { GIT_MESSAGES } from '../constants/messages';

interface RepositoryListProps {
  provider: GitProviderUI;
  onAddRepository: () => void;
}

export const RepositoryList: React.FC<RepositoryListProps> = ({
  provider,
  onAddRepository,
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

  const handleRemoveRepository = useCallback((repo: GitRepoUI) => {
    setRepoToRemove(repo);
    setDeleteDialogOpen(true);
  }, []);

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

      // Auto-dismiss success alert after 3 seconds
      setTimeout(() => {
        setDeleteAlert(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to remove repository:', error);
      setDeleteAlert({
        type: 'error',
        message: GIT_MESSAGES.error.repositoryRemoveFailed,
      });
      setDeleteDialogOpen(false);
      setRepoToRemove(null);
    }
  }, [repoToRemove, provider.id, removeRepositoryMutation]);

  const tableData = useMemo<PMTableRow[]>(() => {
    if (!repositories) return [];

    return repositories.map((repo: GitRepoUI) => ({
      id: repo.id,
      repository: (
        <PMVStack align="start" gap={1}>
          <PMText variant="body-important">
            {repo.owner}/{repo.repo}
          </PMText>
          <PMText variant="small">{repo.owner}</PMText>
        </PMVStack>
      ),
      branch: (
        <PMBadge colorScheme="green" size="sm">
          {repo.branch}
        </PMBadge>
      ),
      actions: (
        <PMButton
          variant="outline"
          colorScheme="red"
          size="sm"
          onClick={() => handleRemoveRepository(repo)}
          loading={removeRepositoryMutation.isPending}
        >
          Remove
        </PMButton>
      ),
    }));
  }, [
    repositories,
    removeRepositoryMutation.isPending,
    handleRemoveRepository,
  ]);

  if (isLoading) {
    return (
      <PMBox p={4} borderRadius="md" shadow="sm">
        <PMHeading level="h3">Loading Repositories...</PMHeading>
        <PMText as="p" variant="body">
          Please wait while we fetch the repositories for this provider.
        </PMText>
      </PMBox>
    );
  }

  if (isError) {
    return (
      <PMBox
        p={4}
        borderRadius="md"
        shadow="sm"
        borderLeft="4px solid"
        borderLeftColor="red.500"
      >
        <PMHeading level="h3">Error Loading Repositories</PMHeading>
        <PMText as="p" variant="body">
          Sorry, we couldn't load the repositories for this provider.
        </PMText>
        {error && (
          <PMText as="p" variant="small" color="error">
            Error: {error.message}
          </PMText>
        )}
      </PMBox>
    );
  }

  // Define columns for the table
  const columns: PMTableColumn[] = [
    { key: 'repository', header: 'Repository', width: '40%', grow: true },
    { key: 'branch', header: 'Branch', width: '20%', align: 'center' },
    { key: 'actions', header: 'Actions', width: '15%', align: 'center' },
  ];

  return (
    <PMBox className="repository-list" p={4} borderRadius="md" shadow="sm">
      {/* Delete Success/Error Alert */}
      {deleteAlert && (
        <PMBox mb={4}>
          <PMAlert.Root status={deleteAlert.type}>
            <PMAlert.Indicator />
            <PMAlert.Title>{deleteAlert.message}</PMAlert.Title>
          </PMAlert.Root>
        </PMBox>
      )}

      <PMHStack justify="space-between" mb={4}>
        <PMVStack align="start" gap={1}>
          <PMHeading level="h3">Repositories</PMHeading>
          <PMText variant="small">
            {provider.source.toUpperCase()} • {provider.url}
          </PMText>
        </PMVStack>
        <PMButton size="sm" colorScheme="blue" onClick={onAddRepository}>
          Add Repository
        </PMButton>
      </PMHStack>

      {tableData.length === 0 ? (
        <PMBox
          p={6}
          borderRadius="md"
          border="2px dashed"
          borderColor="gray.200"
        >
          <PMEmptyState
            title="No Repositories Added"
            description="Add repositories to this git provider to start managing them."
          >
            <PMButton size="sm" colorScheme="blue" onClick={onAddRepository}>
              Add Your First Repository
            </PMButton>
          </PMEmptyState>
        </PMBox>
      ) : (
        <PMTable
          columns={columns}
          data={tableData}
          striped={true}
          hoverable={true}
          size="md"
          variant="line"
          showColumnBorder={false}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <PMDialog.Root
        open={deleteDialogOpen}
        onOpenChange={({ open }) => setDeleteDialogOpen(open)}
      >
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title>Remove Repository</PMDialog.Title>
            </PMDialog.Header>
            <PMDialog.Body>
              <PMText>
                {repoToRemove &&
                  GIT_MESSAGES.confirmation.removeRepository(
                    repoToRemove.owner,
                    repoToRemove.repo,
                  )}
              </PMText>
            </PMDialog.Body>
            <PMDialog.Footer>
              <PMButton
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setRepoToRemove(null);
                }}
              >
                Cancel
              </PMButton>
              <PMButton
                colorScheme="red"
                onClick={confirmRemoveRepository}
                loading={removeRepositoryMutation.isPending}
              >
                Remove
              </PMButton>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMDialog.Root>
    </PMBox>
  );
};
