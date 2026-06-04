import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PMBox,
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMHStack,
  PMHeading,
  PMIcon,
  PMPortal,
  PMText,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { LuArrowLeft, LuPencil, LuTrash2 } from 'react-icons/lu';
import { OrganizationId } from '@packmind/types';
import { GitProviderUI } from '../../types/GitProviderTypes';
import {
  useAddRepositoryMutation,
  useCheckProviderAuthQuery,
  useGetAvailableRepositoriesQuery,
  useGetRepositoriesByProviderQuery,
  useRemoveRepositoryMutation,
  useRevokeGithubAppMutation,
  useUpdateGitProviderMutation,
} from '../../api/queries';
import { extractErrorMessage } from '../../utils/errorUtils';
import { VendorMark } from '../shared/VendorMark';
import { ConnectionStatusPill } from '../shared/ConnectionStatusPill';
import {
  ConnectionStatusView,
  deriveConnectionStatus,
  toStatusBucket,
} from '../shared/connectionStatus';
import { ManageReposPanel } from './ManageReposPanel';
import { ReauthPanel } from './ReauthPanel';
import { ApplyProgress, DrawerMode, ReauthDraft, RepoSelection } from './types';

export interface ConnectionDrawerProps {
  organizationId: OrganizationId;
  connection: GitProviderUI | null;
  onClose: () => void;
  onDelete: (provider: GitProviderUI) => void;
}

const INITIAL_REAUTH: ReauthDraft = {
  patValue: '',
  status: 'idle',
  errorMessage: null,
};

const repoKey = (owner: string, name: string) => `${owner}/${name}`;

export const ConnectionDrawer: React.FC<ConnectionDrawerProps> = ({
  organizationId,
  connection,
  onClose,
  onDelete,
}) => {
  return (
    <PMDrawer.Root
      open={!!connection}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="end"
      size="md"
    >
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            {connection && (
              <DrawerBody
                organizationId={organizationId}
                connection={connection}
                onDelete={onDelete}
                onClose={onClose}
              />
            )}
            <PMDrawer.CloseTrigger asChild>
              <PMCloseButton size="sm" />
            </PMDrawer.CloseTrigger>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
};

interface DrawerBodyProps {
  organizationId: OrganizationId;
  connection: GitProviderUI;
  onDelete: (provider: GitProviderUI) => void;
  onClose: () => void;
}

const DrawerBody: React.FC<DrawerBodyProps> = ({
  organizationId,
  connection,
  onDelete,
  onClose,
}) => {
  const [mode, setMode] = useState<DrawerMode>('view');
  const trackedQuery = useGetRepositoriesByProviderQuery(connection.id);
  const availableQuery = useGetAvailableRepositoriesQuery(connection.id);

  const initialSelection = useMemo<RepoSelection>(() => {
    const tracked = trackedQuery.data ?? [];
    return {
      trackedKeys: tracked.map((r) => repoKey(r.owner, r.repo)),
      branchByKey: Object.fromEntries(
        tracked.map((r) => [repoKey(r.owner, r.repo), r.branch]),
      ),
    };
  }, [trackedQuery.data]);

  const [selection, setSelection] = useState<RepoSelection>(initialSelection);
  const [progress, setProgress] = useState<ApplyProgress | null>(null);
  const [reauthDraft, setReauthDraft] = useState<ReauthDraft>(INITIAL_REAUTH);

  useEffect(() => {
    setMode('view');
    setProgress(null);
    setReauthDraft(INITIAL_REAUTH);
  }, [connection.id]);

  useEffect(() => {
    setSelection(initialSelection);
  }, [initialSelection]);

  const addMutation = useAddRepositoryMutation();
  const removeMutation = useRemoveRepositoryMutation();
  const updateMutation = useUpdateGitProviderMutation();
  const revokeMutation = useRevokeGithubAppMutation();

  const diff = useMemo(() => {
    const before = new Set(initialSelection.trackedKeys);
    const after = new Set(selection.trackedKeys);
    const adds: string[] = [];
    const removes: string[] = [];
    const updates: string[] = [];
    for (const key of after) {
      if (!before.has(key)) {
        adds.push(key);
      } else if (
        selection.branchByKey[key] !== initialSelection.branchByKey[key]
      ) {
        updates.push(key);
      }
    }
    for (const key of before) if (!after.has(key)) removes.push(key);
    return { adds, removes, updates };
  }, [
    initialSelection.branchByKey,
    initialSelection.trackedKeys,
    selection.branchByKey,
    selection.trackedKeys,
  ]);

  const hasDiff =
    diff.adds.length > 0 || diff.removes.length > 0 || diff.updates.length > 0;

  const applyDiff = useCallback(async () => {
    const total =
      diff.adds.length + diff.removes.length + diff.updates.length * 2;
    if (total === 0) return;

    const tracked = trackedQuery.data ?? [];
    const available = availableQuery.data ?? [];
    const findTracked = (key: string) =>
      tracked.find((r) => repoKey(r.owner, r.repo) === key);
    const findAvail = (key: string) =>
      available.find((r) => r.fullName === key);

    let current = 0;
    setProgress({ phase: 'running', current, total, label: '' });

    const doRemove = async (key: string): Promise<boolean> => {
      const repo = findTracked(key);
      if (!repo) {
        current++;
        return true;
      }
      setProgress({
        phase: 'running',
        current,
        total,
        label: `removing ${key}`,
      });
      try {
        await removeMutation.mutateAsync({
          providerId: connection.id,
          repoId: repo.id,
        });
      } catch (err) {
        setProgress({
          phase: 'error',
          current,
          total,
          label: key,
          errorMessage: extractErrorMessage(err, `Failed to remove ${key}.`),
        });
        return false;
      }
      current++;
      return true;
    };

    const doAdd = async (key: string): Promise<boolean> => {
      const avail = findAvail(key);
      if (!avail) {
        current++;
        return true;
      }
      const branch = selection.branchByKey[key] ?? avail.defaultBranch;
      setProgress({
        phase: 'running',
        current,
        total,
        label: `adding ${key}`,
      });
      try {
        await addMutation.mutateAsync({
          providerId: connection.id,
          data: { owner: avail.owner, name: avail.name, branch },
        });
      } catch (err) {
        setProgress({
          phase: 'error',
          current,
          total,
          label: key,
          errorMessage: extractErrorMessage(err, `Failed to add ${key}.`),
        });
        return false;
      }
      current++;
      return true;
    };

    for (const key of diff.removes) {
      if (!(await doRemove(key))) return;
    }
    for (const key of diff.updates) {
      if (!(await doRemove(key))) return;
      if (!(await doAdd(key))) return;
    }
    for (const key of diff.adds) {
      if (!(await doAdd(key))) return;
    }

    setProgress(null);
    setMode('view');
    pmToaster.create({
      type: 'success',
      title: 'Repositories updated',
      description: diffSummary(
        diff.adds.length,
        diff.removes.length,
        diff.updates.length,
      ),
    });
  }, [
    addMutation,
    availableQuery.data,
    connection.id,
    diff.adds,
    diff.removes,
    diff.updates,
    removeMutation,
    selection.branchByKey,
    trackedQuery.data,
  ]);

  const submitPatReauth = useCallback(async () => {
    const token = reauthDraft.patValue.trim();
    if (!token) return;
    setReauthDraft((prev) => ({
      ...prev,
      status: 'validating',
      errorMessage: null,
    }));
    try {
      await updateMutation.mutateAsync({
        id: connection.id,
        data: { token },
      });
      setReauthDraft((prev) => ({
        ...prev,
        status: 'success',
        errorMessage: null,
      }));
      window.setTimeout(() => {
        pmToaster.create({
          type: 'success',
          title: 'Connection re-authenticated',
        });
        setMode('view');
        setReauthDraft(INITIAL_REAUTH);
      }, 800);
    } catch (err) {
      setReauthDraft((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: extractErrorMessage(
          err,
          'That token did not validate. Confirm the scopes and that the token belongs to this instance.',
        ),
      }));
    }
  }, [connection.id, reauthDraft.patValue, updateMutation]);

  const handleAppInstallSuccess = useCallback(() => {
    pmToaster.create({
      type: 'success',
      title: 'GitHub App re-installed',
    });
    setMode('view');
  }, []);

  const revokeApp = useCallback(async () => {
    try {
      await revokeMutation.mutateAsync();
      pmToaster.create({
        type: 'success',
        title: 'GitHub App revoked',
      });
      onClose();
    } catch (err) {
      pmToaster.create({
        type: 'error',
        title: 'Failed to revoke',
        description: extractErrorMessage(
          err,
          'Failed to revoke the GitHub App connection.',
        ),
      });
    }
  }, [onClose, revokeMutation]);

  const usesApp =
    connection.source === 'github' && connection.authMethod === 'app';
  const repoCount = trackedQuery.data?.length ?? connection.repos?.length ?? 0;
  const applying = progress?.phase === 'running';

  return (
    <>
      <PMDrawer.Header borderBottom="1px solid" borderColor="border.tertiary">
        <PMHStack gap={3} align="center">
          <VendorMark vendor={connection.source} size="md" showLabel={false} />
          <PMVStack gap={0.5} align="start" flex={1} minW={0}>
            <PMHeading level="h4" truncate>
              {connection.url ?? 'Untitled connection'}
            </PMHeading>
            <PMText fontSize="xs" color="faded">
              {usesApp ? 'GitHub App' : 'Personal access token'}
            </PMText>
          </PMVStack>
        </PMHStack>
      </PMDrawer.Header>

      <PMDrawer.Body padding={5} display="flex" flexDirection="column">
        <PMVStack gap={6} align="stretch" flex={1} minH={0}>
          {mode === 'view' && (
            <ViewMode
              connection={connection}
              repoCount={repoCount}
              onManageRepos={() => setMode('edit-repos')}
              onReauth={() => setMode('reauth')}
              onRevoke={usesApp ? revokeApp : null}
              isRevoking={revokeMutation.isPending}
            />
          )}

          {mode === 'edit-repos' && (
            <ManageReposPanel
              provider={connection}
              selection={selection}
              onSelectionChange={setSelection}
              progress={progress}
            />
          )}

          {mode === 'reauth' && (
            <ReauthPanel
              provider={connection}
              organizationId={organizationId}
              draft={reauthDraft}
              onDraftChange={setReauthDraft}
              onSubmitPat={submitPatReauth}
              onAppInstallSuccess={handleAppInstallSuccess}
            />
          )}
        </PMVStack>
      </PMDrawer.Body>

      <PMBox
        borderTop="1px solid"
        borderColor="border.tertiary"
        paddingX={5}
        paddingY={3}
      >
        {mode === 'view' && (
          <PMHStack justify="space-between" align="center">
            <PMButton
              variant="ghost"
              size="sm"
              onClick={() => onDelete(connection)}
              disabled={repoCount > 0}
              data-testid="connection-drawer-delete"
            >
              <PMIcon fontSize="sm" color="red.500">
                <LuTrash2 />
              </PMIcon>
              <PMText fontSize="xs" color="error" fontWeight="medium">
                Delete connection
              </PMText>
            </PMButton>
            {repoCount > 0 && (
              <PMText fontSize="xs" color="faded">
                Remove tracked repos first to delete.
              </PMText>
            )}
          </PMHStack>
        )}

        {mode === 'edit-repos' && (
          <PMHStack justify="space-between" align="center">
            <PMButton
              variant="ghost"
              size="sm"
              disabled={applying}
              onClick={() => {
                setSelection(initialSelection);
                setProgress(null);
                setMode('view');
              }}
            >
              <PMIcon fontSize="sm" color="text.secondary">
                <LuArrowLeft />
              </PMIcon>
              <PMText fontSize="xs" color="secondary" fontWeight="medium">
                Cancel
              </PMText>
            </PMButton>
            <PMHStack gap={3} align="center">
              {hasDiff && (
                <PMText fontSize="xs" color="faded">
                  {diffSummary(
                    diff.adds.length,
                    diff.removes.length,
                    diff.updates.length,
                  )}
                </PMText>
              )}
              <PMButton
                variant="primary"
                size="sm"
                disabled={!hasDiff || applying}
                loading={applying}
                onClick={applyDiff}
                data-testid="manage-repos-apply"
              >
                Apply changes
              </PMButton>
            </PMHStack>
          </PMHStack>
        )}

        {mode === 'reauth' && (
          <PMHStack justify="space-between" align="center">
            <PMButton
              variant="ghost"
              size="sm"
              onClick={() => {
                setReauthDraft(INITIAL_REAUTH);
                setMode('view');
              }}
              disabled={reauthDraft.status === 'validating'}
            >
              <PMIcon fontSize="sm" color="text.secondary">
                <LuArrowLeft />
              </PMIcon>
              <PMText fontSize="xs" color="secondary" fontWeight="medium">
                Back
              </PMText>
            </PMButton>
            {!usesApp && (
              <PMButton
                variant="primary"
                size="sm"
                disabled={
                  !reauthDraft.patValue.trim() ||
                  reauthDraft.status === 'validating' ||
                  reauthDraft.status === 'success'
                }
                loading={reauthDraft.status === 'validating'}
                onClick={submitPatReauth}
                data-testid="reauth-submit"
              >
                {reauthDraft.status === 'success' ? 'Updated' : 'Update token'}
              </PMButton>
            )}
          </PMHStack>
        )}
      </PMBox>
    </>
  );
};

interface ViewModeProps {
  connection: GitProviderUI;
  repoCount: number;
  onManageRepos: () => void;
  onReauth: () => void;
  onRevoke: (() => void) | null;
  isRevoking: boolean;
}

const ViewMode: React.FC<ViewModeProps> = ({
  connection,
  repoCount,
  onManageRepos,
  onReauth,
  onRevoke,
  isRevoking,
}) => {
  return (
    <>
      <StatusBlock
        connection={connection}
        onReauth={onReauth}
        onRevoke={onRevoke}
        isRevoking={isRevoking}
      />

      <PMVStack gap={2} align="stretch">
        <PMHStack justify="space-between" align="baseline">
          <PMText
            fontSize="xs"
            color="faded"
            textTransform="uppercase"
            letterSpacing="wider"
            fontWeight="semibold"
          >
            Repositories ({repoCount})
          </PMText>
          <PMButton
            variant="ghost"
            size="xs"
            onClick={onManageRepos}
            data-testid="connection-drawer-manage-repos"
          >
            <PMHStack gap={1.5} align="center">
              <PMIcon fontSize="xs" color="text.secondary">
                <LuPencil />
              </PMIcon>
              <PMText fontSize="xs" color="secondary" fontWeight="medium">
                Manage
              </PMText>
            </PMHStack>
          </PMButton>
        </PMHStack>
        <RepositoriesPreview connection={connection} repoCount={repoCount} />
      </PMVStack>
    </>
  );
};

const StatusBlock: React.FC<{
  connection: GitProviderUI;
  onReauth: () => void;
  onRevoke: (() => void) | null;
  isRevoking: boolean;
}> = ({ connection, onReauth, onRevoke, isRevoking }) => {
  const probe = useCheckProviderAuthQuery(connection.id, {
    enabled: connection.hasAuth,
  });

  const view: ConnectionStatusView = deriveConnectionStatus(probe, {
    hasAuth: connection.hasAuth,
  });
  const isFailing = view.kind !== 'connected' && view.kind !== 'checking';
  const bucket = toStatusBucket(view);

  return (
    <PMVStack
      gap={2}
      align="stretch"
      data-testid="connection-drawer-status"
      data-status={bucket}
    >
      <PMText
        fontSize="xs"
        color="faded"
        textTransform="uppercase"
        letterSpacing="wider"
        fontWeight="semibold"
      >
        Status
      </PMText>
      <ConnectionStatusPill
        view={view}
        variant="block"
        actions={
          <PMHStack gap={3} align="center">
            <PMBox
              as="button"
              onClick={onReauth}
              bg="transparent"
              border="none"
              padding="0"
              cursor="pointer"
              fontSize="xs"
              color={isFailing ? 'text.primary' : 'text.secondary'}
              fontWeight="medium"
              textDecoration="underline"
              textUnderlineOffset="2px"
              _hover={{ color: 'branding.primary' }}
              data-testid="connection-drawer-reauth"
            >
              Re-authenticate
            </PMBox>
            {onRevoke && (
              <>
                <PMText fontSize="xs" color="faded">
                  ·
                </PMText>
                <PMBox
                  as="button"
                  onClick={isRevoking ? undefined : onRevoke}
                  aria-disabled={isRevoking}
                  bg="transparent"
                  border="none"
                  padding="0"
                  cursor={isRevoking ? 'not-allowed' : 'pointer'}
                  opacity={isRevoking ? 0.6 : 1}
                  fontSize="xs"
                  color="error"
                  fontWeight="medium"
                  textDecoration="underline"
                  textUnderlineOffset="2px"
                  _hover={{ color: 'red.400' }}
                  data-testid="connection-drawer-revoke-app"
                >
                  {isRevoking ? 'Revoking…' : 'Revoke connection'}
                </PMBox>
              </>
            )}
          </PMHStack>
        }
      />
    </PMVStack>
  );
};

const RepositoriesPreview: React.FC<{
  connection: GitProviderUI;
  repoCount: number;
}> = ({ connection, repoCount }) => {
  const tracked = useGetRepositoriesByProviderQuery(connection.id);
  const rows = tracked.data ?? [];

  if (repoCount === 0) {
    return (
      <PMBox
        borderWidth="1px"
        borderColor="border.tertiary"
        borderStyle="dashed"
        borderRadius="md"
        paddingX={5}
        paddingY={6}
        textAlign="center"
      >
        <PMText fontSize="sm" color="secondary">
          No repositories tracked. Click Manage to pick from your{' '}
          {connection.source === 'github' ? 'GitHub' : 'GitLab'} account.
        </PMText>
      </PMBox>
    );
  }

  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      overflow="hidden"
      bg="background.secondary"
      maxHeight="220px"
      overflowY="auto"
    >
      {rows.map((repo, idx) => (
        <PMHStack
          key={repo.id}
          gap={3}
          align="center"
          paddingX={3}
          paddingY={2.5}
          borderBottom={idx === rows.length - 1 ? undefined : '1px solid'}
          borderColor="border.tertiary"
        >
          <PMVStack gap={0.5} align="start" flex={1} minW={0}>
            <PMText fontSize="sm" color="primary" truncate>
              {repo.repo}
            </PMText>
            <PMText fontSize="xs" color="faded" truncate>
              {repo.owner}/{repo.repo} · {repo.branch}
            </PMText>
          </PMVStack>
        </PMHStack>
      ))}
    </PMBox>
  );
};

function diffSummary(adds: number, removes: number, updates: number): string {
  const parts: string[] = [];
  if (adds > 0) parts.push(`+${adds} added`);
  if (removes > 0) parts.push(`−${removes} removed`);
  if (updates > 0) parts.push(`~${updates} updated`);
  return parts.join(', ');
}
