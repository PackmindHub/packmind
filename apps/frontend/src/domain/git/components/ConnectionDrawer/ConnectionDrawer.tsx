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
import {
  LuArrowLeft,
  LuArrowRight,
  LuGitBranch,
  LuPencil,
  LuTrash2,
} from 'react-icons/lu';
import { Link } from 'react-router';
import {
  GitProviderVendor,
  MarketplaceListItem,
  OrganizationId,
} from '@packmind/types';
import { GitProviderUI } from '../../types/GitProviderTypes';
import {
  useAddRepositoryMutation,
  useCheckProviderAuthQuery,
  useGetGitProvidersQuery,
  useGetRepositoriesByProviderQuery,
  useRemoveRepositoryMutation,
  useRevokeGithubAppMutation,
  useUpdateGitProviderMutation,
} from '../../api/queries';
import { useMarketplaces } from '../../../marketplaces/api/queries';
import { useAuthContext } from '../../../accounts/hooks';
import { extractErrorMessage } from '../../utils/errorUtils';
import { DisplayNameEditor } from './DisplayNameEditor';
import { VendorMark } from '../shared/VendorMark';
import { ConnectionStatusPill } from '../shared/ConnectionStatusPill';
import {
  ConnectionStatusView,
  deriveConnectionStatus,
  toStatusBucket,
} from '../shared/connectionStatus';
import { ManageReposPanel } from './ManageReposPanel';
import { ReauthPanel } from './ReauthPanel';
import {
  ApplyProgress,
  DrawerMode,
  ReauthDraft,
  RepoSelection,
  RepoTuple,
  tupleKey,
} from './types';

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

export const ConnectionDrawer: React.FC<ConnectionDrawerProps> = ({
  organizationId,
  connection,
  onClose,
  onDelete,
}) => {
  const [editingDisplayName, setEditingDisplayName] = useState(false);

  useEffect(() => {
    if (!connection) setEditingDisplayName(false);
  }, [connection]);

  return (
    <PMDrawer.Root
      open={!!connection}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="end"
      size="md"
      closeOnEscape={!editingDisplayName}
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
                onEditingDisplayNameChange={setEditingDisplayName}
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
  onEditingDisplayNameChange: (editing: boolean) => void;
}

const DrawerBody: React.FC<DrawerBodyProps> = ({
  organizationId,
  connection,
  onDelete,
  onClose,
  onEditingDisplayNameChange,
}) => {
  const [mode, setMode] = useState<DrawerMode>('view');
  const trackedQuery = useGetRepositoriesByProviderQuery(connection.id);

  const initialSelection = useMemo<RepoSelection>(() => {
    const tracked = trackedQuery.data ?? [];
    return {
      tuples: tracked.map((r) => ({
        owner: r.owner,
        repo: r.repo,
        branch: r.branch,
      })),
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

  const { data: marketplacesData } = useMarketplaces(organizationId);
  const marketplacesForConnection = useMemo<MarketplaceListItem[]>(
    () =>
      (marketplacesData ?? []).filter(
        (m) => m.repository?.gitProviderId === connection.id,
      ),
    [marketplacesData, connection.id],
  );

  const diff = useMemo(() => {
    const before = new Set(initialSelection.tuples.map(tupleKey));
    const after = new Set(selection.tuples.map(tupleKey));
    const adds: RepoTuple[] = [];
    const removes: RepoTuple[] = [];
    for (const t of selection.tuples) {
      if (!before.has(tupleKey(t))) adds.push(t);
    }
    for (const t of initialSelection.tuples) {
      if (!after.has(tupleKey(t))) removes.push(t);
    }
    return { adds, removes };
  }, [initialSelection.tuples, selection.tuples]);

  const hasDiff = diff.adds.length > 0 || diff.removes.length > 0;

  const applyDiff = useCallback(async () => {
    const total = diff.adds.length + diff.removes.length;
    if (total === 0) return;

    const tracked = trackedQuery.data ?? [];
    const findTracked = (t: RepoTuple) =>
      tracked.find(
        (r) =>
          r.owner === t.owner && r.repo === t.repo && r.branch === t.branch,
      );

    const formatTuple = (t: RepoTuple) => `${t.owner}/${t.repo} · ${t.branch}`;

    let current = 0;
    setProgress({ phase: 'running', current, total, label: '' });

    const doRemove = async (t: RepoTuple): Promise<boolean> => {
      const repo = findTracked(t);
      if (!repo) {
        current++;
        return true;
      }
      setProgress({
        phase: 'running',
        current,
        total,
        label: `removing ${formatTuple(t)}`,
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
          label: formatTuple(t),
          errorMessage: extractErrorMessage(
            err,
            `Failed to remove ${formatTuple(t)}.`,
          ),
        });
        return false;
      }
      current++;
      return true;
    };

    const doAdd = async (t: RepoTuple): Promise<boolean> => {
      setProgress({
        phase: 'running',
        current,
        total,
        label: `adding ${formatTuple(t)}`,
      });
      try {
        await addMutation.mutateAsync({
          providerId: connection.id,
          data: { owner: t.owner, name: t.repo, branch: t.branch },
        });
      } catch (err) {
        setProgress({
          phase: 'error',
          current,
          total,
          label: formatTuple(t),
          errorMessage: extractErrorMessage(
            err,
            `Failed to add ${formatTuple(t)}.`,
          ),
        });
        return false;
      }
      current++;
      return true;
    };

    for (const t of diff.removes) {
      if (!(await doRemove(t))) return;
    }
    for (const t of diff.adds) {
      if (!(await doAdd(t))) return;
    }

    setProgress(null);
    setMode('view');
    pmToaster.create({
      type: 'success',
      title: 'Repositories updated',
      description: diffSummary(diff.adds.length, diff.removes.length),
    });
  }, [
    addMutation,
    connection.id,
    diff.adds,
    diff.removes,
    removeMutation,
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
  const repoCount = new Set(
    (trackedQuery.data ?? connection.repos ?? []).map(
      (r) => `${r.owner}/${r.repo}`,
    ),
  ).size;
  const applying = progress?.phase === 'running';
  const placeholder = vendorPlaceholder(connection.source);
  const headerTitle = connection.displayName.trim() || placeholder;

  const providersQuery = useGetGitProvidersQuery();
  const otherNames = useMemo(
    () =>
      (providersQuery.data?.providers ?? [])
        .filter((p) => p.id !== connection.id)
        .map((p) => p.displayName),
    [providersQuery.data, connection.id],
  );

  const submitDisplayName = useCallback(
    async (next: string) => {
      await updateMutation.mutateAsync({
        id: connection.id,
        data: { displayName: next },
      });
      pmToaster.create({
        type: 'success',
        title: 'Connection renamed',
      });
    },
    [connection.id, updateMutation],
  );

  return (
    <>
      <PMDrawer.Header borderBottom="1px solid" borderColor="border.tertiary">
        <PMHStack gap={3} align="center">
          <VendorMark vendor={connection.source} size="md" showLabel={false} />
          <PMVStack gap={0.5} align="start" flex={1} minW={0}>
            <PMHeading
              level="h4"
              truncate
              fontStyle={connection.displayName.trim() ? 'normal' : 'italic'}
              color={connection.displayName.trim() ? 'primary' : 'faded'}
            >
              {headerTitle}
            </PMHeading>
            <PMText fontSize="xs" color="faded" truncate>
              {connection.url ??
                (usesApp ? 'GitHub App' : 'Personal access token')}
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
              marketplaces={marketplacesForConnection}
              placeholder={placeholder}
              otherNames={otherNames}
              onSaveDisplayName={submitDisplayName}
              onEditingDisplayNameChange={onEditingDisplayNameChange}
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
              onRequestReauth={() => setMode('reauth')}
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
                  {diffSummary(diff.adds.length, diff.removes.length)}
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
  marketplaces: MarketplaceListItem[];
  placeholder: string;
  otherNames: string[];
  onSaveDisplayName: (next: string) => Promise<void>;
  onEditingDisplayNameChange: (editing: boolean) => void;
  onManageRepos: () => void;
  onReauth: () => void;
  onRevoke: (() => void) | null;
  isRevoking: boolean;
}

const ViewMode: React.FC<ViewModeProps> = ({
  connection,
  repoCount,
  marketplaces,
  placeholder,
  otherNames,
  onSaveDisplayName,
  onEditingDisplayNameChange,
  onManageRepos,
  onReauth,
  onRevoke,
  isRevoking,
}) => {
  return (
    <>
      <DisplayNameEditor
        value={connection.displayName}
        placeholder={placeholder}
        otherNames={otherNames}
        onSave={onSaveDisplayName}
        onEditingChange={onEditingDisplayNameChange}
      />

      <StatusBlock
        connection={connection}
        onReauth={onReauth}
        onRevoke={onRevoke}
        isRevoking={isRevoking}
      />

      {marketplaces.length > 0 && (
        <MarketplacesPreview marketplaces={marketplaces} />
      )}

      <PMVStack gap={2} align="stretch" flex={1} minH={0}>
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

  const groups = useMemo(() => {
    const map = new Map<string, { fullName: string; branches: string[] }>();
    for (const r of rows) {
      const key = `${r.owner}/${r.repo}`;
      let group = map.get(key);
      if (!group) {
        group = { fullName: key, branches: [] };
        map.set(key, group);
      }
      group.branches.push(r.branch);
    }
    for (const g of map.values()) {
      g.branches.sort((a, b) => a.localeCompare(b));
    }
    return Array.from(map.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName),
    );
  }, [rows]);

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
        flex={1}
        minH={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
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
      bg="background.secondary"
      flex={1}
      minH={0}
      overflowX="hidden"
      overflowY="auto"
    >
      {groups.map((group, idx) => (
        <PMBox
          key={group.fullName}
          borderBottom={idx === groups.length - 1 ? undefined : '1px solid'}
          borderColor="border.tertiary"
        >
          <PMBox
            paddingX={3}
            paddingY={2}
            bg="background.tertiary"
            borderBottom="1px solid"
            borderColor="border.tertiary"
          >
            <PMText fontSize="sm" color="primary" fontWeight="medium" truncate>
              {group.fullName}
            </PMText>
          </PMBox>
          {group.branches.map((branch) => (
            <PMBox key={branch} paddingX={3} paddingY={1.5} paddingLeft={6}>
              <PMHStack gap={2} align="center" minW={0}>
                <PMIcon fontSize="2xs" color="text.faded">
                  <LuGitBranch />
                </PMIcon>
                <PMText fontSize="sm" color="secondary" truncate>
                  {branch}
                </PMText>
              </PMHStack>
            </PMBox>
          ))}
        </PMBox>
      ))}
    </PMBox>
  );
};

const MarketplacesPreview: React.FC<{
  marketplaces: MarketplaceListItem[];
}> = ({ marketplaces }) => {
  const { organization } = useAuthContext();
  const orgSlug = organization?.slug;

  const sorted = useMemo(
    () =>
      [...marketplaces].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    [marketplaces],
  );

  return (
    <PMVStack
      gap={2}
      align="stretch"
      data-testid="connection-drawer-marketplaces"
    >
      <PMHStack justify="space-between" align="baseline">
        <PMText
          fontSize="xs"
          color="faded"
          textTransform="uppercase"
          letterSpacing="wider"
          fontWeight="semibold"
        >
          Marketplaces ({sorted.length})
        </PMText>
        {orgSlug && (
          <Link
            to={`/org/${orgSlug}/marketplaces`}
            data-testid="connection-drawer-marketplaces-manage"
          >
            <PMHStack
              gap={1.5}
              align="center"
              color="secondary"
              _hover={{ color: 'branding.primary' }}
            >
              <PMText fontSize="xs" fontWeight="medium">
                Manage in Marketplaces
              </PMText>
              <PMIcon fontSize="xs">
                <LuArrowRight />
              </PMIcon>
            </PMHStack>
          </Link>
        )}
      </PMHStack>
      <PMBox
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="md"
        bg="background.secondary"
        overflow="hidden"
      >
        {sorted.map((marketplace, idx) => (
          <PMVStack
            key={marketplace.id}
            gap={0.5}
            align="stretch"
            paddingX={3}
            paddingY={2}
            borderBottom={idx === sorted.length - 1 ? undefined : '1px solid'}
            borderColor="border.tertiary"
          >
            <PMText fontSize="sm" color="primary" fontWeight="medium" truncate>
              {marketplace.name}
            </PMText>
            <PMText fontSize="xs" color="secondary" truncate>
              {marketplaceCoordinates(marketplace)}
            </PMText>
          </PMVStack>
        ))}
      </PMBox>
    </PMVStack>
  );
};

function marketplaceCoordinates(marketplace: MarketplaceListItem): string {
  const repository = marketplace.repository;
  if (!repository) return 'Repository unavailable';
  return `${repository.owner}/${repository.repo} · ${repository.branch}`;
}

function diffSummary(adds: number, removes: number): string {
  const parts: string[] = [];
  if (adds > 0) parts.push(`${adds} added`);
  if (removes > 0) parts.push(`${removes} removed`);
  return parts.join(', ');
}

function vendorPlaceholder(vendor: GitProviderVendor): string {
  if (vendor === 'github') return 'Unnamed GitHub connection';
  if (vendor === 'gitlab') return 'Unnamed GitLab connection';
  return 'Unnamed connection';
}
