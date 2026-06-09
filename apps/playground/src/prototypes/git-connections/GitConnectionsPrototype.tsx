import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMNativeSelect,
  PMPage,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuPlus } from 'react-icons/lu';
import { ConnectionsTable } from './components/list/ConnectionsTable';
import { CliManagedTable } from './components/list/CliManagedTable';
import { ConnectionsEmptyState } from './components/list/ConnectionsEmptyState';
import { LoadingSkeleton } from './components/list/LoadingSkeleton';
import { ConnectionDrawer } from './components/detail/ConnectionDrawer';
import { AddConnectionDrawer } from './components/connect/AddConnectionDrawer';
import { STUB_CLI_ENTRIES, STUB_CONNECTIONS } from './data';
import type {
  Edition,
  RepoSelectionState,
  Scenario,
  UserConnection,
} from './types';

const SCENARIO_ITEMS: Array<{ label: string; value: Scenario }> = [
  { label: 'Default (4 connections, mixed states)', value: 'default' },
  { label: 'Empty (first-run)', value: 'empty' },
  { label: 'Loading', value: 'loading' },
  { label: 'All healthy', value: 'mixed-errors' },
  {
    label:
      'Name-collision (try renaming "Internal mirror" to "Production marketplace")',
    value: 'name-collision',
  },
];

type Tab = 'connections' | 'cli';

const EDITION_ITEMS: Array<{ label: string; value: Edition }> = [
  { label: 'Cloud', value: 'cloud' },
  { label: 'OSS', value: 'oss' },
];

export default function GitConnectionsPrototype() {
  const [scenario, setScenario] = useState<Scenario>('default');
  const [edition, setEdition] = useState<Edition>('cloud');
  const [tab, setTab] = useState<Tab>('connections');
  const [connections, setConnections] =
    useState<UserConnection[]>(STUB_CONNECTIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (scenario === 'empty' || scenario === 'loading') {
      setConnections([]);
      setSelectedId(null);
      return;
    }
    if (scenario === 'mixed-errors') {
      setConnections(
        STUB_CONNECTIONS.map((c) => ({
          ...c,
          status: 'connected',
          statusDetail: undefined,
        })),
      );
      return;
    }
    setConnections(STUB_CONNECTIONS);
  }, [scenario]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  const selectedConnection = useMemo(
    () => connections.find((c) => c.id === selectedId) ?? null,
    [connections, selectedId],
  );

  const cliCount = STUB_CLI_ENTRIES.length;

  const handleRename = useCallback((id: string, next: string) => {
    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, displayName: next } : c)),
    );
    setToast(`Renamed to "${next || 'unnamed connection'}".`);
  }, []);

  const handleRefresh = useCallback((id: string) => {
    setRefreshingId(id);
    setTimeout(() => {
      setRefreshingId(null);
      setToast('Status refreshed.');
    }, 900);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      const target = connections.find((c) => c.id === id);
      setToast(
        `Delete confirmation opens for "${target?.displayName.trim() || 'unnamed connection'}".`,
      );
    },
    [connections],
  );

  const handleAddSubmit = useCallback((next: UserConnection) => {
    setConnections((prev) => [next, ...prev]);
    setAddOpen(false);
    setToast('Connection added.');
  }, []);

  const handleApplyRepoChanges = useCallback(
    (id: string, draft: RepoSelectionState) => {
      setConnections((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const nextRepos = draft.trackedIds.map((repoId) => {
            const existing = c.repos.find((r) => r.id === repoId);
            const available = c.availableRepos.find((r) => r.id === repoId);
            const path = existing?.path ?? available?.path ?? repoId;
            const defaultBranch =
              existing?.defaultBranch ?? available?.defaultBranch ?? 'main';
            const branch =
              draft.branchByRepoId[repoId] ?? existing?.branch ?? defaultBranch;
            return {
              id: repoId,
              path,
              branch,
              defaultBranch,
              duplicatedIn: existing?.duplicatedIn,
            };
          });
          return { ...c, repos: nextRepos };
        }),
      );
      const c = connections.find((x) => x.id === id);
      const before = new Set(c?.repos.map((r) => r.id));
      const after = new Set(draft.trackedIds);
      const added = [...after].filter((r) => !before.has(r)).length;
      const removed = [...before].filter((r) => !after.has(r)).length;
      const parts: string[] = [];
      if (added > 0) parts.push(`+${added}`);
      if (removed > 0) parts.push(`−${removed}`);
      setToast(
        parts.length > 0
          ? `Repositories updated (${parts.join(', ')}).`
          : 'Repository tracking updated.',
      );
    },
    [connections],
  );

  const handleReauthSuccess = useCallback((id: string) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'connected',
              statusDetail: undefined,
              lastCheckedAt: new Date().toISOString(),
            }
          : c,
      ),
    );
    setToast('Connection re-authenticated.');
  }, []);

  const existingInstances = useMemo(
    () => connections.map((c) => `https://${c.identifier.split('/')[0]}`),
    [connections],
  );

  return (
    <PMPage
      title="Git connections"
      subtitle="Grant Packmind access to specific repos. Each connection is the bridge that lets Packmind publish your standards, recipes, and marketplace packages on your team's behalf."
      isFullWidth
      actions={
        <PMHStack gap={3} align="center">
          <PMHStack gap={2} align="center">
            <PMText fontSize="xs" color="faded">
              Edition
            </PMText>
            <PMNativeSelect
              items={EDITION_ITEMS}
              value={edition}
              onChange={(e) => setEdition(e.target.value as Edition)}
              size="sm"
              width="110px"
            />
          </PMHStack>
          <PMHStack gap={2} align="center">
            <PMText fontSize="xs" color="faded">
              Scenario
            </PMText>
            <PMNativeSelect
              items={SCENARIO_ITEMS.map((s) => ({
                label: s.label,
                value: s.value,
              }))}
              value={scenario}
              onChange={(e) => setScenario(e.target.value as Scenario)}
              size="sm"
              width="320px"
            />
          </PMHStack>
          <PMButton
            variant="primary"
            size="sm"
            onClick={() => setAddOpen(true)}
          >
            <PMIcon fontSize="sm">
              <LuPlus />
            </PMIcon>
            Add connection
          </PMButton>
        </PMHStack>
      }
    >
      <PMVStack gap={5} align="stretch">
        <TabBar
          activeTab={tab}
          onChange={setTab}
          connectionsCount={connections.length}
          cliCount={cliCount}
          loading={scenario === 'loading'}
        />

        {tab === 'connections' && (
          <>
            {scenario === 'loading' && <LoadingSkeleton />}
            {scenario !== 'loading' && connections.length === 0 && (
              <ConnectionsEmptyState onAddConnection={() => setAddOpen(true)} />
            )}
            {scenario !== 'loading' && connections.length > 0 && (
              <ConnectionsTable
                connections={connections}
                selectedId={selectedId}
                onOpenRow={(id) => setSelectedId(id)}
                onRefreshRow={handleRefresh}
                onRenameRow={(id) => setSelectedId(id)}
                onDeleteRow={handleDelete}
                refreshingId={refreshingId}
              />
            )}
          </>
        )}

        {tab === 'cli' && <CliManagedTable entries={STUB_CLI_ENTRIES} />}

        <FooterHint tab={tab} connectionCount={connections.length} />
      </PMVStack>

      <ConnectionDrawer
        connection={selectedConnection}
        onClose={() => setSelectedId(null)}
        allConnections={connections}
        onRename={handleRename}
        onRefresh={handleRefresh}
        onApplyRepoChanges={handleApplyRepoChanges}
        onReauthSuccess={handleReauthSuccess}
        refreshing={
          !!selectedConnection && refreshingId === selectedConnection.id
        }
      />

      <AddConnectionDrawer
        open={addOpen}
        edition={edition}
        existingInstances={existingInstances}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddSubmit}
      />

      <Toast message={toast} />
    </PMPage>
  );
}

type TabBarProps = {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
  connectionsCount: number;
  cliCount: number;
  loading: boolean;
};

function TabBar({
  activeTab,
  onChange,
  connectionsCount,
  cliCount,
  loading,
}: Readonly<TabBarProps>) {
  return (
    <PMHStack
      gap={0}
      align="end"
      borderBottom="1px solid"
      borderColor="border.tertiary"
    >
      <TabTrigger
        active={activeTab === 'connections'}
        onClick={() => onChange('connections')}
        label="Connections"
        count={loading ? undefined : connectionsCount}
      />
      <TabTrigger
        active={activeTab === 'cli'}
        onClick={() => onChange('cli')}
        label="CLI-managed"
        count={cliCount}
        muted
      />
    </PMHStack>
  );
}

type TabTriggerProps = {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  muted?: boolean;
};

function TabTrigger({
  active,
  onClick,
  label,
  count,
  muted,
}: Readonly<TabTriggerProps>) {
  return (
    <PMBox
      as="button"
      onClick={onClick}
      bg="transparent"
      border="none"
      paddingX={4}
      paddingY={3}
      cursor="pointer"
      display="flex"
      alignItems="center"
      gap="8px"
      color={active ? 'text.primary' : 'text.secondary'}
      borderBottom="2px solid"
      borderBottomColor={active ? 'branding.primary' : 'transparent'}
      marginBottom="-1px"
      fontSize="sm"
      fontWeight={active ? 'semibold' : 'medium'}
      _hover={active ? undefined : { color: 'text.primary' }}
      transition="color 120ms ease-out, border-color 120ms ease-out"
    >
      {label}
      {typeof count === 'number' && (
        <PMBadge
          size="xs"
          variant={active && !muted ? 'solid' : 'outline'}
          colorPalette={muted ? 'gray' : 'blue'}
        >
          {count}
        </PMBadge>
      )}
    </PMBox>
  );
}

function FooterHint({
  tab,
  connectionCount,
}: Readonly<{ tab: Tab; connectionCount: number }>) {
  if (tab === 'cli') return null;
  if (connectionCount === 0) return null;
  return (
    <PMText fontSize="xs" color="faded">
      Status is checked when you open this page and on demand. Last push is
      aggregated across standards, recipes, and marketplace publishes.
    </PMText>
  );
}

function Toast({ message }: Readonly<{ message: string | null }>) {
  return (
    <PMBox
      position="fixed"
      bottom="24px"
      right="24px"
      pointerEvents={message ? 'auto' : 'none'}
      opacity={message ? 1 : 0}
      transform={message ? 'translateY(0)' : 'translateY(6px)'}
      transition="opacity 200ms ease-out, transform 200ms ease-out"
      zIndex={2000}
    >
      <PMHStack
        gap={2}
        paddingX={3}
        paddingY={2}
        bg="background.primary"
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="md"
        align="center"
        boxShadow="0 8px 24px rgba(0,0,0,0.32)"
      >
        <PMText fontSize="xs" color="primary" fontWeight="medium">
          {message ?? ' '}
        </PMText>
      </PMHStack>
    </PMBox>
  );
}
