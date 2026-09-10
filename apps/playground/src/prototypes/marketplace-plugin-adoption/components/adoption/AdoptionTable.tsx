import { useMemo } from 'react';
import {
  PMBox,
  PMHStack,
  PMIcon,
  PMTable,
  PMText,
  PMVStack,
  useTableSort,
  type PMTableColumn,
} from '@packmind/ui';
import { LuChevronDown, LuChevronRight } from 'react-icons/lu';
import type { GroupMode, Install } from '../../types';
import {
  formatLastSeen,
  repoLabelOf,
  shortRevision,
  sortGroups,
  sortInstalls,
  statusOf,
  type AdoptionGroup,
  type FlatSortKey,
  type SortKey,
} from '../../utils/adoption';
import {
  AgentBadge,
  GitIdentityBadge,
  ScopeBadge,
  StatusBadge,
} from '../badges';

// One table, two shapes: grouped rows that expand into their installs, or the
// flat install list when "Group by: Nothing" is chosen. Grouping is a view of
// the same rows, so a repository and a machine-wide install can finally be read
// on the same screen — in today's UI each axis hid the other's rows entirely.

type AdoptionTableRow = Record<string, React.ReactNode> & { __id: string };

type AdoptionTableProps = {
  groupMode: GroupMode;
  groups: AdoptionGroup[];
  installs: Install[];
  publishedRevision: string | null;
  expandedKeys: Set<string>;
  onToggleExpand: (key: string) => void;
  /** Hide the agent column when only one agent reports installs. */
  showAgentColumn: boolean;
};

export function AdoptionTable({
  groupMode,
  groups,
  installs,
  publishedRevision,
  expandedKeys,
  onToggleExpand,
  showAgentColumn,
}: Readonly<AdoptionTableProps>) {
  // Behind-first by default: the reader opens this surface because something is
  // behind, so the answer should not need a sort click.
  const groupSort = useTableSort({ defaultSortKey: 'status' });
  const flatSort = useTableSort({ defaultSortKey: 'status' });

  if (groupMode === 'none') {
    return (
      <FlatTable
        installs={installs}
        publishedRevision={publishedRevision}
        showAgentColumn={showAgentColumn}
        sort={flatSort}
      />
    );
  }

  return (
    <GroupedTable
      groupMode={groupMode}
      groups={groups}
      publishedRevision={publishedRevision}
      expandedKeys={expandedKeys}
      onToggleExpand={onToggleExpand}
      showAgentColumn={showAgentColumn}
      sort={groupSort}
    />
  );
}

type SortState = ReturnType<typeof useTableSort>;

// ── Grouped ─────────────────────────────────────────────────────────────────

const GROUP_HEADER: Record<Exclude<GroupMode, 'none'>, string> = {
  repository: 'Repository',
  person: 'Person',
  agent: 'Agent',
};

function GroupedTable({
  groupMode,
  groups,
  publishedRevision,
  expandedKeys,
  onToggleExpand,
  showAgentColumn,
  sort,
}: Readonly<Omit<AdoptionTableProps, 'installs'> & { sort: SortState }>) {
  const mode = groupMode as Exclude<GroupMode, 'none'>;

  const columns = useMemo<PMTableColumn[]>(() => {
    const base: PMTableColumn[] = [
      {
        key: 'name',
        header: GROUP_HEADER[mode],
        grow: true,
        sortable: true,
        sortDirection: sort.getSortDirection('name'),
      },
      {
        key: 'installs',
        header: 'Installs',
        width: '90px',
        align: 'center',
        sortable: true,
        sortDirection: sort.getSortDirection('installs'),
      },
    ];
    if (showAgentColumn && mode !== 'agent') {
      base.push({ key: 'agents', header: 'Agents', width: '190px' });
    }
    base.push(
      {
        key: 'status',
        header: 'Status',
        width: '130px',
        align: 'center',
        sortable: true,
        sortDirection: sort.getSortDirection('status'),
      },
      {
        key: 'lastSeen',
        header: 'Last seen',
        width: '110px',
        align: 'right',
        sortable: true,
        sortDirection: sort.getSortDirection('lastSeen'),
      },
    );
    return base;
  }, [mode, showAgentColumn, sort]);

  const rows = useMemo<AdoptionTableRow[]>(() => {
    const sorted = sortGroups(
      groups,
      (sort.sortKey ?? 'status') as SortKey,
      sort.sortDirection,
    );
    const out: AdoptionTableRow[] = [];
    for (const group of sorted) {
      const expanded = expandedKeys.has(group.key);
      out.push({
        __id: `group:${group.key}`,
        name: (
          <GroupNameCell
            group={group}
            expanded={expanded}
            onToggle={() => onToggleExpand(group.key)}
          />
        ),
        installs: (
          <PMText
            fontSize="sm"
            color="secondary"
            fontVariantNumeric="tabular-nums"
          >
            {group.installs.length}
          </PMText>
        ),
        agents: (
          <PMHStack gap={1.5} align="center">
            {group.agents.map((agent) => (
              <AgentBadge key={agent} agent={agent} />
            ))}
          </PMHStack>
        ),
        status: (
          <GroupStatusCell
            group={group}
            publishedRevision={publishedRevision}
          />
        ),
        lastSeen: (
          <PMText fontSize="xs" color="faded" fontVariantNumeric="tabular-nums">
            {formatLastSeen(group.lastSeenMinutes)}
          </PMText>
        ),
      });

      if (!expanded) continue;

      for (const install of sortInstalls(
        group.installs,
        'lastSeen',
        'asc',
        publishedRevision,
      )) {
        out.push({
          __id: `install:${install.id}`,
          name: <ChildNameCell install={install} mode={mode} />,
          // Blank rather than "1": a child row *is* one install, and repeating
          // that under a column header counting them adds nothing.
          installs: null,
          agents: (
            <PMHStack gap={1.5} align="center">
              <AgentBadge agent={install.agent} />
            </PMHStack>
          ),
          status: (
            <StatusBadge
              status={statusOf(install, publishedRevision)}
              hint={installStatusHint(install, publishedRevision)}
            />
          ),
          lastSeen: (
            <PMText
              fontSize="xs"
              color="faded"
              fontVariantNumeric="tabular-nums"
            >
              {formatLastSeen(install.lastSeenMinutes)}
            </PMText>
          ),
        });
      }
    }
    return out;
  }, [
    groups,
    sort.sortKey,
    sort.sortDirection,
    expandedKeys,
    onToggleExpand,
    publishedRevision,
    mode,
  ]);

  return (
    <PMTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.__id}
      onSort={sort.handleSort}
      size="sm"
      striped={false}
      hoverable
      stickyHeader
    />
  );
}

/**
 * Status of the group's newest session, plus the tail it hides. A repository
 * whose latest session is current can still carry stale checkouts, and a badge
 * on its own would report that repository as done.
 */
function GroupStatusCell({
  group,
  publishedRevision,
}: Readonly<{ group: AdoptionGroup; publishedRevision: string | null }>) {
  const behind = group.installs.filter(
    (install) => statusOf(install, publishedRevision) === 'behind',
  ).length;
  const showTail = group.status !== 'behind' && behind > 0;

  return (
    <PMVStack gap={0.5} align="center">
      <StatusBadge
        status={group.status}
        hint={groupStatusHint(group, behind)}
      />
      {showTail && (
        <PMText fontSize="11px" color="faded" fontVariantNumeric="tabular-nums">
          {behind} of {group.installs.length} behind
        </PMText>
      )}
    </PMVStack>
  );
}

function GroupNameCell({
  group,
  expanded,
  onToggle,
}: Readonly<{
  group: AdoptionGroup;
  expanded: boolean;
  onToggle: () => void;
}>) {
  return (
    <PMHStack gap={2} align="start" minWidth={0}>
      <PMBox
        as="button"
        onClick={onToggle}
        bg="transparent"
        border="none"
        cursor="pointer"
        display="flex"
        alignItems="center"
        color="text.faded"
        padding={0}
        marginTop="2px"
        aria-expanded={expanded}
        aria-label={
          expanded
            ? `Collapse ${group.label}`
            : `Expand ${group.label} — ${group.installs.length} installs`
        }
        _hover={{ color: 'text.primary' }}
      >
        <PMIcon fontSize="sm">
          {expanded ? <LuChevronDown /> : <LuChevronRight />}
        </PMIcon>
      </PMBox>
      <PMVStack gap={0.5} align="start" minWidth={0}>
        <PMHStack gap={2} align="center" minWidth={0}>
          <PMText
            fontSize="sm"
            color="primary"
            fontFamily={group.mono ? 'mono' : undefined}
            truncate
          >
            {group.label}
          </PMText>
          {group.gitIdentity && <GitIdentityBadge />}
        </PMHStack>
        <PMText fontSize="xs" color="faded" truncate>
          {group.detail}
        </PMText>
      </PMVStack>
    </PMHStack>
  );
}

function ChildNameCell({
  install,
  mode,
}: Readonly<{ install: Install; mode: Exclude<GroupMode, 'none'> }>) {
  const primary =
    mode === 'repository' ? install.personLabel : repoLabelOf(install);
  const secondary =
    mode === 'agent'
      ? `${install.personLabel} · ${repoLabelOf(install)}`
      : null;

  return (
    <PMHStack gap={2} align="center" minWidth={0} paddingLeft={7}>
      <PMText
        fontSize="xs"
        color="secondary"
        fontFamily={
          mode !== 'repository' && install.scope !== 'user' ? 'mono' : undefined
        }
        truncate
      >
        {mode === 'agent' ? secondary : primary}
      </PMText>
      <ScopeBadge scope={install.scope} />
      {mode === 'repository' && install.identitySource === 'git-config' && (
        <GitIdentityBadge />
      )}
      {/* The revision this session actually ran — the evidence behind its status. */}
      <PMText fontSize="11px" color="faded" fontFamily="mono" flexShrink={0}>
        {shortRevision(install.installedRevision)}
      </PMText>
    </PMHStack>
  );
}

// ── Flat ────────────────────────────────────────────────────────────────────

function FlatTable({
  installs,
  publishedRevision,
  showAgentColumn,
  sort,
}: Readonly<{
  installs: Install[];
  publishedRevision: string | null;
  showAgentColumn: boolean;
  sort: SortState;
}>) {
  const columns = useMemo<PMTableColumn[]>(() => {
    const base: PMTableColumn[] = [
      {
        key: 'repository',
        header: 'Repository',
        grow: true,
        sortable: true,
        sortDirection: sort.getSortDirection('repository'),
      },
      {
        key: 'person',
        header: 'Person',
        grow: true,
        sortable: true,
        sortDirection: sort.getSortDirection('person'),
      },
      { key: 'scope', header: 'Scope', width: '130px' },
    ];
    if (showAgentColumn) {
      base.push({ key: 'agent', header: 'Agent', width: '130px' });
    }
    base.push(
      { key: 'revision', header: 'Revision', width: '100px' },
      {
        key: 'status',
        header: 'Status',
        width: '130px',
        align: 'center',
        sortable: true,
        sortDirection: sort.getSortDirection('status'),
      },
      {
        key: 'lastSeen',
        header: 'Last seen',
        width: '110px',
        align: 'right',
        sortable: true,
        sortDirection: sort.getSortDirection('lastSeen'),
      },
    );
    return base;
  }, [showAgentColumn, sort]);

  const rows = useMemo<AdoptionTableRow[]>(
    () =>
      sortInstalls(
        installs,
        (sort.sortKey ?? 'status') as FlatSortKey,
        sort.sortDirection,
        publishedRevision,
      ).map((install) => ({
        __id: install.id,
        repository: (
          <PMText
            fontSize="sm"
            color={install.scope === 'user' ? 'faded' : 'primary'}
            fontFamily={install.scope === 'user' ? undefined : 'mono'}
            truncate
          >
            {repoLabelOf(install)}
          </PMText>
        ),
        person: (
          <PMHStack gap={2} align="center" minWidth={0}>
            <PMText fontSize="sm" color="primary" truncate>
              {install.personLabel}
            </PMText>
            {install.identitySource === 'git-config' && <GitIdentityBadge />}
          </PMHStack>
        ),
        scope: <ScopeBadge scope={install.scope} />,
        agent: <AgentBadge agent={install.agent} />,
        revision: (
          <PMText fontSize="xs" color="faded" fontFamily="mono">
            {shortRevision(install.installedRevision)}
          </PMText>
        ),
        status: (
          <StatusBadge
            status={statusOf(install, publishedRevision)}
            hint={installStatusHint(install, publishedRevision)}
          />
        ),
        lastSeen: (
          <PMText fontSize="xs" color="faded" fontVariantNumeric="tabular-nums">
            {formatLastSeen(install.lastSeenMinutes)}
          </PMText>
        ),
      })),
    [installs, sort.sortKey, sort.sortDirection, publishedRevision],
  );

  return (
    <PMTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.__id}
      onSort={sort.handleSort}
      size="sm"
      striped={false}
      hoverable
      stickyHeader
    />
  );
}

// ── Status wording ──────────────────────────────────────────────────────────

function installStatusHint(
  install: Install,
  publishedRevision: string | null,
): string | undefined {
  if (!publishedRevision) {
    return 'This plugin was published before revision tracking, so Packmind cannot compare installs yet';
  }
  if (!install.installedRevision) {
    return 'This session reported no revision, so it cannot be confirmed as current';
  }
  if (install.installedRevision === publishedRevision) return undefined;
  return `On ${shortRevision(install.installedRevision)}, published is ${shortRevision(publishedRevision)}`;
}

function groupStatusHint(
  group: AdoptionGroup,
  behind: number,
): string | undefined {
  if (group.status === 'unknown') {
    return 'This plugin was published before revision tracking, so Packmind cannot compare installs yet';
  }
  const total = group.installs.length;
  if (group.status === 'behind') {
    return `The most recent session here is not on the published revision (${behind} of ${total} installs behind)`;
  }
  if (behind > 0) {
    return `The most recent session is current, but ${behind} of ${total} installs here have not caught up — expand to see which`;
  }
  return undefined;
}
