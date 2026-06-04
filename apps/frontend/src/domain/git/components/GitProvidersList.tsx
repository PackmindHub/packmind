import React, { useCallback, useMemo, useState } from 'react';
import {
  PMAlert,
  PMAlertDialog,
  PMBadge,
  PMBox,
  PMButton,
  PMEmptyState,
  PMHStack,
  PMIcon,
  PMSpinner,
  PMTabs,
  PMVStack,
} from '@packmind/ui';
import { LuPlus } from 'react-icons/lu';
import { GitProviderId, OrganizationId } from '@packmind/types';
import {
  useDeleteGitProviderMutation,
  useGetGitProvidersQuery,
} from '../api/queries';
import { GitProviderUI } from '../types/GitProviderTypes';
import { GIT_MESSAGES } from '../constants/messages';
import { AddConnectionDrawer } from './AddConnection/AddConnectionDrawer';
import { ConnectionDrawer } from './ConnectionDrawer/ConnectionDrawer';
import { extractErrorMessage } from '../utils/errorUtils';
import { ConnectionsTable } from './list/ConnectionsTable';
import { ConnectionsEmptyState } from './list/ConnectionsEmptyState';
import { CliManagedTable } from './list/CliManagedTable';

interface GitProvidersListProps {
  organizationId: OrganizationId;
}

export const GitProvidersList: React.FC<GitProvidersListProps> = ({
  organizationId,
}) => {
  const {
    data: providersResponse,
    isLoading,
    isError,
    error,
  } = useGetGitProvidersQuery();
  const providers = providersResponse?.providers;
  const deleteProviderMutation = useDeleteGitProviderMutation();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] =
    useState<GitProviderUI | null>(null);
  const [deleteAlert, setDeleteAlert] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [editingProviderId, setEditingProviderId] =
    useState<GitProviderId | null>(null);
  const [openAddDrawer, setOpenAddDrawer] = useState(false);

  const { userConfigured, cliManaged, cliManagedRepoCount } = useMemo(() => {
    const all = providers ?? [];
    const cli = all.filter((p) => !p.hasAuth);
    return {
      userConfigured: all.filter((p) => p.hasAuth),
      cliManaged: cli,
      cliManagedRepoCount: cli.reduce(
        (acc, p) => acc + (p.repos?.length ?? 0),
        0,
      ),
    };
  }, [providers]);

  // Derive the drawer's connection from the live providers list so updates
  // (e.g. renames via the mutation) flow back into the open drawer.
  const editingProvider = useMemo(
    () => userConfigured.find((p) => p.id === editingProviderId) ?? null,
    [userConfigured, editingProviderId],
  );

  const openCreateDialog = useCallback(() => {
    setEditingProviderId(null);
    setOpenAddDrawer(true);
  }, []);

  const confirmDeleteProvider = useCallback(async () => {
    if (!providerToDelete) return;
    try {
      await deleteProviderMutation.mutateAsync({ id: providerToDelete.id });
      setDeleteAlert({
        type: 'success',
        message: GIT_MESSAGES.success.providerDeleted,
      });
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
      setTimeout(() => setDeleteAlert(null), 3000);
    } catch (err) {
      console.error('Failed to delete git provider:', err);
      setDeleteAlert({
        type: 'error',
        message: extractErrorMessage(
          err,
          GIT_MESSAGES.error.providerDeleteFailed,
        ),
      });
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
    }
  }, [providerToDelete, deleteProviderMutation]);

  if (isLoading) {
    return (
      <PMEmptyState
        icon={<PMSpinner />}
        title="Loading Git connections…"
        description="Please wait while we fetch your connections."
      />
    );
  }

  if (isError) {
    return (
      <PMAlert.Root status="error" my={4}>
        <PMAlert.Indicator />
        <PMAlert.Title>Error loading Git connections</PMAlert.Title>
        <PMAlert.Description>
          Sorry, we couldn't load your connections.{' '}
          {error && `Error: ${error.message}`}
        </PMAlert.Description>
      </PMAlert.Root>
    );
  }

  const tabs = [
    {
      value: 'connections',
      triggerLabel: (
        <TabLabel label="Connections" count={userConfigured.length} />
      ),
      content: (
        <PMVStack align="stretch" gap={4} pt={4}>
          {deleteAlert && (
            <PMAlert.Root status={deleteAlert.type}>
              <PMAlert.Indicator />
              <PMAlert.Title>{deleteAlert.message}</PMAlert.Title>
            </PMAlert.Root>
          )}
          {userConfigured.length === 0 ? (
            <ConnectionsEmptyState onAddConnection={openCreateDialog} />
          ) : (
            <ConnectionsTable
              connections={userConfigured}
              onEdit={(connection) => {
                setEditingProviderId(connection.id);
              }}
              onDelete={(connection) => {
                if ((connection.repos?.length ?? 0) > 0) {
                  return;
                }
                setProviderToDelete(connection);
                setDeleteDialogOpen(true);
              }}
            />
          )}
        </PMVStack>
      ),
    },
    {
      value: 'cli',
      triggerLabel: (
        <TabLabel label="CLI-managed" count={cliManagedRepoCount} muted />
      ),
      content: (
        <PMVStack align="stretch" gap={4} pt={4}>
          <CliManagedTable entries={cliManaged} />
        </PMVStack>
      ),
    },
  ];

  return (
    <PMVStack alignItems="stretch" gap={4} width="full">
      {userConfigured.length > 0 && (
        <PMHStack justify="flex-end">
          <PMButton variant="primary" size="sm" onClick={openCreateDialog}>
            <PMIcon fontSize="sm">
              <LuPlus />
            </PMIcon>
            Add connection
          </PMButton>
        </PMHStack>
      )}

      <PMTabs defaultValue="connections" tabs={tabs} />

      <ConnectionDrawer
        organizationId={organizationId}
        connection={editingProvider}
        onClose={() => setEditingProviderId(null)}
        onDelete={(provider) => {
          setEditingProviderId(null);
          setProviderToDelete(provider);
          setDeleteDialogOpen(true);
        }}
      />

      <AddConnectionDrawer
        organizationId={organizationId}
        open={openAddDrawer}
        onClose={() => setOpenAddDrawer(false)}
        onSuccess={() => setOpenAddDrawer(false)}
      />

      <PMAlertDialog
        title="Delete connection"
        message={GIT_MESSAGES.confirmation.deleteProvider(
          providerToDelete?.url ?? providerToDelete?.source ?? '',
        )}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColorScheme="red"
        onConfirm={confirmDeleteProvider}
        open={deleteDialogOpen}
        onOpenChange={({ open }) => {
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

interface TabLabelProps {
  label: string;
  count: number;
  muted?: boolean;
}

const TabLabel: React.FC<TabLabelProps> = ({ label, count, muted }) => (
  <PMHStack gap={2} align="center">
    <PMBox as="span">{label}</PMBox>
    <PMBadge
      size="xs"
      variant={muted ? 'subtle' : 'outline'}
      colorPalette={muted ? 'gray' : 'blue'}
    >
      {count}
    </PMBadge>
  </PMHStack>
);
