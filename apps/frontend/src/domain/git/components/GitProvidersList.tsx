import React, { useCallback, useMemo, useState } from 'react';
import {
  PMBox,
  PMHStack,
  PMBadge,
  PMButton,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMHeading,
  PMText,
  PMPageSection,
  PMEmptyState,
  PMAlert,
  PMDialog,
} from '@packmind/ui';
import { OrganizationId } from '@packmind/accounts/types';
import {
  useGetGitProvidersQuery,
  useDeleteGitProviderMutation,
} from '../api/queries';
import { GitProviderUI } from '../types/GitProviderTypes';
import { GIT_MESSAGES } from '../constants/messages';

interface GitProvidersListProps {
  organizationId: OrganizationId;
  onCreateProvider: () => void;
  onEditProvider: (provider: GitProviderUI) => void;
  onManageRepositories: (provider: GitProviderUI) => void;
}

export const GitProvidersList: React.FC<GitProvidersListProps> = ({
  organizationId,
  onCreateProvider,
  onEditProvider,
  onManageRepositories,
}) => {
  const {
    data: providers,
    isLoading,
    isError,
    error,
  } = useGetGitProvidersQuery(organizationId);
  const deleteProviderMutation = useDeleteGitProviderMutation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] =
    useState<GitProviderUI | null>(null);
  const [deleteAlert, setDeleteAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleDeleteProvider = useCallback((provider: GitProviderUI) => {
    setProviderToDelete(provider);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDeleteProvider = useCallback(async () => {
    if (!providerToDelete) return;

    try {
      await deleteProviderMutation.mutateAsync({
        id: providerToDelete.id,
        organizationId: providerToDelete.organizationId,
      });
      setDeleteAlert({
        type: 'success',
        message: GIT_MESSAGES.success.providerDeleted,
      });
      setDeleteDialogOpen(false);
      setProviderToDelete(null);

      // Auto-dismiss success alert after 3 seconds
      setTimeout(() => {
        setDeleteAlert(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to delete git provider:', error);
      setDeleteAlert({
        type: 'error',
        message: GIT_MESSAGES.error.providerDeleteFailed,
      });
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
    }
  }, [providerToDelete, deleteProviderMutation]);

  const tableData = useMemo<PMTableRow[]>(() => {
    if (!providers) return [];

    return providers.map((provider: GitProviderUI) => ({
      id: provider.id,
      source: (
        <PMBadge colorScheme="blue" size="sm">
          {provider.source.toUpperCase()}
        </PMBadge>
      ),
      url: provider.url,
      repositoryCount: provider.repos?.length || 0,
      accessToken: (
        <PMBox fontFamily="mono" fontSize="sm" color="gray.600">
          {provider.token
            ? `${provider.token.substring(0, 12)}...`
            : 'No token'}
        </PMBox>
      ),
      actions: (
        <PMHStack gap={2}>
          <PMButton
            variant="primary"
            colorScheme="blue"
            size="sm"
            onClick={() => onManageRepositories(provider)}
          >
            Manage Repositories
          </PMButton>
          <PMButton
            variant="outline"
            size="sm"
            onClick={() => onEditProvider(provider)}
          >
            Edit
          </PMButton>
          <PMButton
            variant="outline"
            colorScheme="red"
            size="sm"
            onClick={() => handleDeleteProvider(provider)}
            loading={deleteProviderMutation.isPending}
          >
            Delete
          </PMButton>
        </PMHStack>
      ),
    }));
  }, [
    providers,
    deleteProviderMutation.isPending,
    handleDeleteProvider,
    onEditProvider,
    onManageRepositories,
  ]);

  if (isLoading) {
    return (
      <PMBox p={4} borderRadius="md" shadow="sm">
        <PMHeading level="h2">Loading Git Providers...</PMHeading>
        <PMText as="p" variant="body">
          Please wait while we fetch your git providers.
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
        <PMHeading level="h2">Error Loading Git Providers</PMHeading>
        <PMText as="p" variant="body">
          Sorry, we couldn't load your git providers.
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
    { key: 'source', header: 'Provider', width: '15%', align: 'center' },
    { key: 'url', header: 'URL', width: '25%', grow: true },
    {
      key: 'repositoryCount',
      header: 'Repositories',
      width: '15%',
      align: 'center',
    },
    { key: 'accessToken', header: 'Access Token', width: '20%' },
    { key: 'actions', header: 'Actions', width: '20%', align: 'center' },
  ];

  return (
    <PMPageSection
      title="Git Providers"
      cta={
        <PMButton colorScheme="blue" onClick={onCreateProvider}>
          Add Git provider
        </PMButton>
      }
    >
      {/* Delete Success/Error Alert */}
      {deleteAlert && (
        <PMBox mb={4}>
          <PMAlert.Root status={deleteAlert.type}>
            <PMAlert.Indicator />
            <PMAlert.Title>{deleteAlert.message}</PMAlert.Title>
          </PMAlert.Root>
        </PMBox>
      )}
      {tableData.length === 0 ? (
        <PMEmptyState
          title={'No Git Providers Found'}
          description="Add your first git provider to start managing repositories."
        >
          <PMButton colorScheme="blue" onClick={onCreateProvider}>
            Add Your First Git Provider
          </PMButton>
        </PMEmptyState>
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
              <PMDialog.Title>Delete Git Provider</PMDialog.Title>
            </PMDialog.Header>
            <PMDialog.Body>
              <PMText>
                {providerToDelete &&
                  GIT_MESSAGES.confirmation.deleteProvider(
                    providerToDelete.source,
                  )}
              </PMText>
            </PMDialog.Body>
            <PMDialog.Footer>
              <PMButton
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setProviderToDelete(null);
                }}
              >
                Cancel
              </PMButton>
              <PMButton
                colorScheme="red"
                onClick={confirmDeleteProvider}
                loading={deleteProviderMutation.isPending}
              >
                Delete
              </PMButton>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMDialog.Root>
    </PMPageSection>
  );
};
