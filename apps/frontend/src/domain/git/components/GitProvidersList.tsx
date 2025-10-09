import React, { useCallback, useMemo, useState } from 'react';
import {
  PMBox,
  PMHStack,
  PMBadge,
  PMButton,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMText,
  PMEmptyState,
  PMAlert,
  PMAlertDialog,
  PMVStack,
  PMSpinner,
  PMMenu,
  PMPortal,
  PMIcon,
  PMEllipsisMenu,
} from '@packmind/ui';
import { OrganizationId } from '@packmind/accounts/types';
import {
  useGetGitProvidersQuery,
  useDeleteGitProviderMutation,
} from '../api/queries';
import { GitProviderUI } from '../types/GitProviderTypes';
import { GIT_MESSAGES } from '../constants/messages';
import { ManageGitProviderDialog } from './ManageGitProviderDialog';
import { extractErrorMessage } from '../utils/errorUtils';
import { LuEllipsis } from 'react-icons/lu';

interface GitProvidersListProps {
  organizationId: OrganizationId;
}

export const GitProvidersList: React.FC<GitProvidersListProps> = ({
  organizationId,
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

  const [editingProvider, setEditingProvider] = useState<GitProviderUI | null>(
    null,
  );
  const [openEditDialog, setOpenEditDialog] = useState(false);

  const handleEditDialogVisibility = (open: boolean) => {
    setEditingProvider(null);
    setOpenEditDialog(open);
  };

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
        message: extractErrorMessage(
          error,
          GIT_MESSAGES.error.providerDeleteFailed,
        ),
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
      actions: (
        <PMEllipsisMenu
          actions={[
            {
              value: 'edit',
              onClick: () => {
                setEditingProvider(provider);
                setOpenEditDialog(true);
              },
              content: <PMText color="secondary">Edit</PMText>,
            },
            {
              value: 'delete',
              onClick: () => {
                setProviderToDelete(provider);
                setDeleteDialogOpen(true);
              },
              content: <PMText color="error">Delete</PMText>,
            },
          ]}
        />
      ),
    }));
  }, [providers]);

  if (isLoading) {
    return (
      <PMEmptyState
        icon={<PMSpinner />}
        title="Loading Git Providers..."
        description="Please wait while we fetch your git providers."
      />
    );
  }

  if (isError) {
    return (
      <PMAlert.Root status="error" my={4}>
        <PMAlert.Indicator />
        <PMAlert.Title>Error Loading Git Providers</PMAlert.Title>
        <PMAlert.Description>
          Sorry, we couldn't load your git providers.{' '}
          {error && `Error: ${error.message}`}
        </PMAlert.Description>
      </PMAlert.Root>
    );
  }

  // Define columns for the table
  const columns: PMTableColumn[] = [
    { key: 'source', header: 'Vendor', width: '15%', align: 'center' },
    { key: 'url', header: 'URL', width: '35%', grow: true },
    {
      key: 'repositoryCount',
      header: 'Repositories',
      width: '15%',
      align: 'center',
    },
    { key: 'actions', header: 'Actions', width: '35%', align: 'center' },
  ];

  return (
    <PMVStack alignItems={'stretch'} gap={0} width="full">
      {tableData.length > 0 && (
        <PMHStack justifyContent={'flex-end'}>
          <PMButton
            onClick={() => {
              setEditingProvider(null);
              setOpenEditDialog(true);
            }}
          >
            Add
          </PMButton>
        </PMHStack>
      )}

      {deleteAlert && (
        <PMBox my={4}>
          <PMAlert.Root status={deleteAlert.type}>
            <PMAlert.Indicator />
            <PMAlert.Title>{deleteAlert.message}</PMAlert.Title>
          </PMAlert.Root>
        </PMBox>
      )}

      {tableData.length === 0 ? (
        <PMEmptyState
          title={'No providers Found'}
          description="Add your first git provider to start distributing your content"
        >
          <PMButton
            size={'xl'}
            onClick={() => {
              setEditingProvider(null);
              setOpenEditDialog(true);
            }}
          >
            Add a git provider
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

      <ManageGitProviderDialog
        organizationId={organizationId}
        editingProvider={editingProvider}
        open={openEditDialog}
        setOpen={handleEditDialogVisibility}
        onSuccess={(provider) => {
          if (!editingProvider) {
            setEditingProvider(provider);
          } else {
            setEditingProvider(null);
          }
        }}
      />

      <PMAlertDialog
        title="Delete Git Provider"
        message={GIT_MESSAGES.confirmation.deleteProvider(
          providerToDelete?.source || '',
        )}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColorScheme="red"
        onConfirm={confirmDeleteProvider}
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setDeleteDialogOpen(true);
          } else {
            setDeleteDialogOpen(false);
            setProviderToDelete(null);
          }
        }}
        isLoading={deleteProviderMutation.isPending}
      />
    </PMVStack>
  );
};
