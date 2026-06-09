import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from '@packmind/ui';
import {
  LuArrowLeft,
  LuPencil,
  LuRefreshCw,
  LuRotateCcw,
  LuTrash2,
} from 'react-icons/lu';
import type {
  DrawerMode,
  ReauthDraft,
  RepoSelectionState,
  UserConnection,
} from '../../types';
import { VendorMark } from '../shared/VendorMark';
import { ConnectionStatusPill } from '../shared/ConnectionStatusPill';
import {
  formatAbsoluteDate,
  formatAbsoluteDateTime,
  formatRelativeTime,
} from '../shared/formatters';
import { DisplayNameEditor } from './DisplayNameEditor';
import { RepoList } from './RepoList';
import { ManageReposPanel } from './ManageReposPanel';
import { ReauthPanel } from './ReauthPanel';

type ConnectionDrawerProps = {
  connection: UserConnection | null;
  onClose: () => void;
  allConnections: UserConnection[];
  onRename: (id: string, next: string) => void;
  onRefresh: (id: string) => void;
  onApplyRepoChanges: (id: string, next: RepoSelectionState) => void;
  onReauthSuccess: (id: string) => void;
  refreshing: boolean;
};

const INITIAL_REAUTH: ReauthDraft = {
  patValue: '',
  status: 'idle',
  errorMessage: null,
  appPopupOpen: false,
};

export function ConnectionDrawer({
  connection,
  onClose,
  allConnections,
  onRename,
  onRefresh,
  onApplyRepoChanges,
  onReauthSuccess,
  refreshing,
}: Readonly<ConnectionDrawerProps>) {
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
                connection={connection}
                allConnections={allConnections}
                onRename={onRename}
                onRefresh={onRefresh}
                onApplyRepoChanges={onApplyRepoChanges}
                onReauthSuccess={onReauthSuccess}
                refreshing={refreshing}
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
}

type DrawerBodyProps = {
  connection: UserConnection;
  allConnections: UserConnection[];
  onRename: (id: string, next: string) => void;
  onRefresh: (id: string) => void;
  onApplyRepoChanges: (id: string, next: RepoSelectionState) => void;
  onReauthSuccess: (id: string) => void;
  refreshing: boolean;
};

function DrawerBody({
  connection,
  allConnections,
  onRename,
  onRefresh,
  onApplyRepoChanges,
  onReauthSuccess,
  refreshing,
}: Readonly<DrawerBodyProps>) {
  const placeholder = `Unnamed ${connection.vendor === 'github' ? 'GitHub' : 'GitLab'} connection`;
  const otherNames = allConnections
    .filter((c) => c.id !== connection.id)
    .map((c) => c.displayName);
  const duplicateCount = connection.repos.filter(
    (r) => r.duplicatedIn && r.duplicatedIn.length > 0,
  ).length;

  const [mode, setMode] = useState<DrawerMode>('view');

  const initialSelection = useMemo<RepoSelectionState>(
    () => ({
      trackedIds: connection.repos.map((r) => r.id),
      branchByRepoId: Object.fromEntries(
        connection.repos.map((r) => [r.id, r.branch]),
      ),
    }),
    [connection.repos],
  );

  const [repoDraft, setRepoDraft] =
    useState<RepoSelectionState>(initialSelection);
  const [reauthDraft, setReauthDraft] = useState<ReauthDraft>(INITIAL_REAUTH);

  useEffect(() => {
    setMode('view');
    setRepoDraft(initialSelection);
    setReauthDraft(INITIAL_REAUTH);
  }, [connection.id, initialSelection]);

  const toggleRepo = useCallback(
    (repoId: string) => {
      setRepoDraft((prev) => {
        const has = prev.trackedIds.includes(repoId);
        if (has) {
          return {
            ...prev,
            trackedIds: prev.trackedIds.filter((id) => id !== repoId),
          };
        }
        const available = connection.availableRepos.find(
          (r) => r.id === repoId,
        );
        return {
          trackedIds: [...prev.trackedIds, repoId],
          branchByRepoId: {
            ...prev.branchByRepoId,
            [repoId]:
              prev.branchByRepoId[repoId] ?? available?.defaultBranch ?? 'main',
          },
        };
      });
    },
    [connection.availableRepos],
  );

  const changeBranch = useCallback((repoId: string, branch: string) => {
    setRepoDraft((prev) => ({
      ...prev,
      branchByRepoId: { ...prev.branchByRepoId, [repoId]: branch },
    }));
  }, []);

  const { added, removed, branchChanged } = useMemo(() => {
    const prevIds = new Set(connection.repos.map((r) => r.id));
    const nextIds = new Set(repoDraft.trackedIds);
    let addedCount = 0;
    let removedCount = 0;
    let branchChangedCount = 0;
    for (const id of nextIds) if (!prevIds.has(id)) addedCount++;
    for (const id of prevIds) if (!nextIds.has(id)) removedCount++;
    for (const repo of connection.repos) {
      if (!nextIds.has(repo.id)) continue;
      const nextBranch = repoDraft.branchByRepoId[repo.id];
      if (nextBranch && nextBranch !== repo.branch) branchChangedCount++;
    }
    return {
      added: addedCount,
      removed: removedCount,
      branchChanged: branchChangedCount,
    };
  }, [connection.repos, repoDraft]);

  const hasDiff = added > 0 || removed > 0 || branchChanged > 0;

  const validatePat = useCallback(() => {
    setReauthDraft((prev) => ({
      ...prev,
      status: 'validating',
      errorMessage: null,
    }));
    window.setTimeout(() => {
      setReauthDraft((prev) => {
        if (prev.patValue.includes('bad')) {
          return {
            ...prev,
            status: 'error',
            errorMessage:
              'Token rejected. Confirm the scopes and that the token belongs to this instance.',
          };
        }
        return { ...prev, status: 'success', errorMessage: null };
      });
      window.setTimeout(() => {
        if (connection.id) onReauthSuccess(connection.id);
      }, 1200);
    }, 900);
  }, [connection.id, onReauthSuccess]);

  const startAppInstall = useCallback(() => {
    setReauthDraft((prev) => ({
      ...prev,
      appPopupOpen: true,
      status: 'validating',
    }));
    window.setTimeout(() => {
      setReauthDraft((prev) => ({
        ...prev,
        appPopupOpen: false,
        status: 'success',
      }));
      window.setTimeout(() => onReauthSuccess(connection.id), 1200);
    }, 1500);
  }, [connection.id, onReauthSuccess]);

  return (
    <>
      <PMDrawer.Header borderBottom="1px solid" borderColor="border.tertiary">
        <PMVStack gap={3} align="stretch" flex={1}>
          <PMHStack gap={3} align="center">
            <VendorMark
              vendor={connection.vendor}
              size="md"
              showLabel={false}
            />
            <PMVStack gap={0.5} align="start" flex={1} minW={0}>
              <PMHeading size="md" truncate>
                {connection.displayName.trim() || placeholder}
              </PMHeading>
              <PMText fontSize="xs" color="faded" truncate>
                {connection.identifier}
              </PMText>
            </PMVStack>
          </PMHStack>
        </PMVStack>
      </PMDrawer.Header>

      <PMDrawer.Body padding={5}>
        <PMVStack gap={6} align="stretch">
          {mode === 'view' && (
            <>
              <DisplayNameEditor
                value={connection.displayName}
                placeholder={placeholder}
                otherNames={otherNames}
                onSave={(next) => onRename(connection.id, next)}
              />

              <StatusBlock
                connection={connection}
                onRefresh={() => onRefresh(connection.id)}
                onReauth={() => setMode('reauth')}
                refreshing={refreshing}
              />

              <MetaGrid connection={connection} />

              <PMVStack gap={2} align="stretch">
                <PMHStack justify="space-between" align="baseline">
                  <PMText
                    fontSize="xs"
                    color="faded"
                    textTransform="uppercase"
                    letterSpacing="wider"
                    fontWeight="semibold"
                  >
                    Repositories ({connection.repos.length})
                  </PMText>
                  <PMHStack gap={3} align="center">
                    {duplicateCount > 0 && (
                      <PMText fontSize="xs" color="warning" fontWeight="medium">
                        {duplicateCount} also reachable elsewhere
                      </PMText>
                    )}
                    <PMButton
                      variant="ghost"
                      size="xs"
                      onClick={() => setMode('edit-repos')}
                    >
                      <PMHStack gap={1.5} align="center">
                        <PMIcon fontSize="xs" color="text.secondary">
                          <LuPencil />
                        </PMIcon>
                        <PMText
                          fontSize="xs"
                          color="secondary"
                          fontWeight="medium"
                        >
                          Manage
                        </PMText>
                      </PMHStack>
                    </PMButton>
                  </PMHStack>
                </PMHStack>
                <PMBox
                  borderWidth="1px"
                  borderColor="border.tertiary"
                  borderRadius="md"
                  overflow="hidden"
                  bg="background.secondary"
                >
                  <RepoList
                    repos={connection.repos}
                    allConnections={allConnections}
                  />
                </PMBox>
              </PMVStack>
            </>
          )}

          {mode === 'edit-repos' && (
            <ManageReposPanel
              connection={connection}
              draft={repoDraft}
              onToggle={toggleRepo}
              onBranchChange={changeBranch}
            />
          )}

          {mode === 'reauth' && (
            <ReauthPanel
              connection={connection}
              draft={reauthDraft}
              onChangePat={(value) =>
                setReauthDraft((prev) => ({
                  ...prev,
                  patValue: value,
                  status: prev.status === 'error' ? 'idle' : prev.status,
                  errorMessage: null,
                }))
              }
              onValidatePat={validatePat}
              onStartAppInstall={startAppInstall}
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
            <PMButton variant="ghost" size="sm">
              <PMIcon fontSize="sm" color="red.500">
                <LuTrash2 />
              </PMIcon>
              <PMText fontSize="xs" color="error" fontWeight="medium">
                Delete connection
              </PMText>
            </PMButton>
            {connection.status === 'token_expired' && (
              <PMButton
                variant="primary"
                size="sm"
                onClick={() => setMode('reauth')}
              >
                <PMIcon fontSize="sm">
                  <LuRotateCcw />
                </PMIcon>
                Reconnect
              </PMButton>
            )}
          </PMHStack>
        )}

        {mode === 'edit-repos' && (
          <PMHStack justify="space-between" align="center">
            <PMButton
              variant="ghost"
              size="sm"
              onClick={() => {
                setRepoDraft(initialSelection);
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
                  <DiffSummary
                    added={added}
                    removed={removed}
                    branchChanged={branchChanged}
                  />
                </PMText>
              )}
              <PMButton
                variant="primary"
                size="sm"
                disabled={!hasDiff}
                onClick={() => {
                  onApplyRepoChanges(connection.id, repoDraft);
                  setMode('view');
                }}
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
              disabled={
                reauthDraft.status === 'validating' || reauthDraft.appPopupOpen
              }
            >
              <PMIcon fontSize="sm" color="text.secondary">
                <LuArrowLeft />
              </PMIcon>
              <PMText fontSize="xs" color="secondary" fontWeight="medium">
                Back
              </PMText>
            </PMButton>
            {connection.authMethod === 'pat' && (
              <PMButton
                variant="primary"
                size="sm"
                disabled={
                  !reauthDraft.patValue.trim() ||
                  reauthDraft.status === 'validating' ||
                  reauthDraft.status === 'success'
                }
                onClick={validatePat}
              >
                {reauthDraft.status === 'success' ? 'Updated' : 'Update token'}
              </PMButton>
            )}
          </PMHStack>
        )}
      </PMBox>
    </>
  );
}

type StatusBlockProps = {
  connection: UserConnection;
  onRefresh: () => void;
  onReauth: () => void;
  refreshing: boolean;
};

function StatusBlock({
  connection,
  onRefresh,
  onReauth,
  refreshing,
}: Readonly<StatusBlockProps>) {
  return (
    <PMVStack gap={2} align="stretch">
      <PMText
        fontSize="xs"
        color="faded"
        textTransform="uppercase"
        letterSpacing="wider"
        fontWeight="semibold"
      >
        Status
      </PMText>
      <PMBox
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="md"
        padding={3}
        bg="background.secondary"
      >
        <PMHStack justify="space-between" align="flex-start" gap={3}>
          <PMVStack gap={2} align="stretch" flex={1}>
            <ConnectionStatusPill status={connection.status} variant="block" />
            {connection.statusDetail && (
              <PMText fontSize="xs" color="secondary">
                {connection.statusDetail}
              </PMText>
            )}
            <PMHStack gap={2.5} align="center">
              <PMText fontSize="xs" color="faded">
                Last check: {formatAbsoluteDateTime(connection.lastCheckedAt)}
              </PMText>
              <PMText fontSize="xs" color="faded">
                ·
              </PMText>
              <PMBox
                as="button"
                onClick={onReauth}
                bg="transparent"
                border="none"
                padding="0"
                cursor="pointer"
                fontSize="xs"
                color={
                  connection.status === 'connected'
                    ? 'text.secondary'
                    : 'text.primary'
                }
                fontWeight="medium"
                textDecoration="underline"
                textUnderlineOffset="2px"
                _hover={{ color: 'branding.primary' }}
              >
                Re-authenticate
              </PMBox>
            </PMHStack>
          </PMVStack>
          <PMButton
            variant="tertiary"
            size="xs"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <PMIcon
              fontSize="xs"
              animation={refreshing ? 'spin 800ms linear infinite' : undefined}
              css={{
                '@keyframes spin': {
                  from: { transform: 'rotate(0deg)' },
                  to: { transform: 'rotate(360deg)' },
                },
              }}
            >
              <LuRefreshCw />
            </PMIcon>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </PMButton>
        </PMHStack>
      </PMBox>
    </PMVStack>
  );
}

function MetaGrid({ connection }: Readonly<{ connection: UserConnection }>) {
  return (
    <PMBox
      display="grid"
      gridTemplateColumns="1fr 1fr"
      gap={4}
      paddingY={3}
      borderTop="1px solid"
      borderBottom="1px solid"
      borderColor="border.tertiary"
    >
      <MetaItem
        label="Last push"
        value={
          connection.lastPushAt
            ? formatRelativeTime(connection.lastPushAt)
            : 'Never used'
        }
        muted={!connection.lastPushAt}
        sublabel={
          connection.lastPushAt
            ? formatAbsoluteDateTime(connection.lastPushAt)
            : 'No artifact has been published through this connection yet.'
        }
      />
      <MetaItem
        label="Installed by"
        value={connection.installedBy}
        sublabel={`on ${formatAbsoluteDate(connection.installedAt)}`}
      />
    </PMBox>
  );
}

type MetaItemProps = {
  label: string;
  value: string;
  sublabel?: string;
  muted?: boolean;
};

function MetaItem({ label, value, sublabel, muted }: Readonly<MetaItemProps>) {
  return (
    <PMVStack gap={1} align="stretch">
      <PMText
        fontSize="xs"
        color="faded"
        textTransform="uppercase"
        letterSpacing="wider"
        fontWeight="semibold"
      >
        {label}
      </PMText>
      <PMText
        fontSize="sm"
        color={muted ? 'faded' : 'primary'}
        fontWeight="medium"
        fontStyle={muted ? 'italic' : 'normal'}
      >
        {value}
      </PMText>
      {sublabel && (
        <PMText fontSize="xs" color="faded">
          {sublabel}
        </PMText>
      )}
    </PMVStack>
  );
}

function DiffSummary({
  added,
  removed,
  branchChanged,
}: Readonly<{ added: number; removed: number; branchChanged: number }>) {
  const parts: string[] = [];
  if (added > 0) parts.push(`+${added} added`);
  if (removed > 0) parts.push(`−${removed} removed`);
  if (branchChanged > 0)
    parts.push(
      `${branchChanged} branch${branchChanged === 1 ? '' : 'es'} changed`,
    );
  return <>{parts.join(', ')}</>;
}
