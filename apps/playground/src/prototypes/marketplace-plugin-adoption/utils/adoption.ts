import type {
  AdoptionFilters,
  Agent,
  GroupMode,
  Install,
  InstallScope,
  InstallStatus,
} from '../types';

// Pure derivation for the adoption surface: status, filtering, grouping,
// sorting, counting. Kept out of the components so a reviewer can read the
// semantics without wading through JSX — and so the header counts and the table
// rows can never disagree, they come from the same functions.

export const GLOBAL_GROUP_KEY = '__machine_wide__';
export const UNIDENTIFIED_GROUP_KEY = '__unidentified_repo__';

/**
 * Status of one install against the published revision.
 *
 * A null published revision makes drift indeterminate for the whole plugin, so
 * every install reads `unknown`. An install that reported no revision of its own
 * counts as `behind`: we cannot confirm it is current, and calling it up-to-date
 * would inflate the coverage number.
 */
export function statusOf(
  install: Install,
  publishedRevision: string | null,
): InstallStatus {
  if (!publishedRevision) return 'unknown';
  if (!install.installedRevision) return 'behind';
  return install.installedRevision === publishedRevision
    ? 'up-to-date'
    : 'behind';
}

export function matchesQuery(install: Install, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    install.repoKey.toLowerCase().includes(q) ||
    install.personLabel.toLowerCase().includes(q) ||
    (install.installedRevision ?? '').toLowerCase().includes(q)
  );
}

export function filterInstalls(
  installs: Install[],
  filters: AdoptionFilters,
  publishedRevision: string | null,
): Install[] {
  return installs.filter((install) => {
    if (!matchesQuery(install, filters.query)) return false;
    if (filters.scopes.length > 0 && !filters.scopes.includes(install.scope)) {
      return false;
    }
    if (filters.agents.length > 0 && !filters.agents.includes(install.agent)) {
      return false;
    }
    if (filters.status === 'all') return true;
    return statusOf(install, publishedRevision) === filters.status;
  });
}

export function isFiltering(filters: AdoptionFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.status !== 'all' ||
    filters.scopes.length > 0 ||
    filters.agents.length > 0
  );
}

export type AdoptionGroup = {
  key: string;
  label: string;
  /** Render the label monospaced (repository paths). */
  mono: boolean;
  /** One-line description of what the group contains, shown under the label. */
  detail: string;
  /** Warn the reader that the label is a git commit email, not an agent account. */
  gitIdentity: boolean;
  installs: Install[];
  /** Status of the most recently seen install — the group's current state. */
  status: InstallStatus;
  lastSeenMinutes: number;
  agents: Agent[];
  scopes: InstallScope[];
};

function distinct<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

function newestInstall(installs: Install[]): Install {
  return installs.reduce((newest, install) =>
    install.lastSeenMinutes < newest.lastSeenMinutes ? install : newest,
  );
}

function repoGroupKey(install: Install): string {
  if (install.scope === 'user') return GLOBAL_GROUP_KEY;
  if (!install.repoResolved || install.repoKey === '') {
    return UNIDENTIFIED_GROUP_KEY;
  }
  return install.repoKey;
}

function groupBy(
  installs: Install[],
  keyOf: (install: Install) => string,
): Map<string, Install[]> {
  const map = new Map<string, Install[]>();
  for (const install of installs) {
    const key = keyOf(install);
    const bucket = map.get(key);
    if (bucket) bucket.push(install);
    else map.set(key, [install]);
  }
  return map;
}

function peopleSummary(installs: Install[]): string {
  const people = distinct(installs.map((i) => i.personLabel));
  if (people.length === 1) return people[0];
  return `${people[0]} +${people.length - 1} more`;
}

function repoSummary(installs: Install[]): string {
  const repos = distinct(
    installs.filter((i) => i.scope !== 'user').map((i) => i.repoKey),
  );
  const globals = installs.filter((i) => i.scope === 'user').length;
  const parts: string[] = [];
  if (repos.length > 0)
    parts.push(pluralize(repos.length, 'repository', 'repositories'));
  if (globals > 0) parts.push('machine-wide');
  return parts.join(' · ') || '—';
}

function toGroup(
  key: string,
  label: string,
  mono: boolean,
  detail: string,
  installs: Install[],
  publishedRevision: string | null,
  gitIdentity = false,
): AdoptionGroup {
  const newest = newestInstall(installs);
  return {
    key,
    label,
    mono,
    detail,
    gitIdentity,
    installs,
    status: statusOf(newest, publishedRevision),
    lastSeenMinutes: newest.lastSeenMinutes,
    agents: distinct(installs.map((i) => i.agent)).sort(),
    scopes: distinct(installs.map((i) => i.scope)),
  };
}

export function buildGroups(
  installs: Install[],
  mode: GroupMode,
  publishedRevision: string | null,
): AdoptionGroup[] {
  if (mode === 'none' || installs.length === 0) return [];

  if (mode === 'repository') {
    return Array.from(groupBy(installs, repoGroupKey).entries()).map(
      ([key, group]) => {
        if (key === GLOBAL_GROUP_KEY) {
          return toGroup(
            key,
            'Machine-wide installs',
            false,
            `${pluralize(distinct(group.map((i) => i.personLabel)).length, 'person', 'people')} · enabled outside any repository`,
            group,
            publishedRevision,
          );
        }
        if (key === UNIDENTIFIED_GROUP_KEY) {
          return toGroup(
            key,
            'Unidentified repository',
            false,
            'The agent reported no usable git remote',
            group,
            publishedRevision,
          );
        }
        return toGroup(
          key,
          key,
          true,
          peopleSummary(group),
          group,
          publishedRevision,
        );
      },
    );
  }

  if (mode === 'person') {
    return Array.from(groupBy(installs, (i) => i.personLabel).entries()).map(
      ([key, group]) =>
        toGroup(
          key,
          key,
          false,
          repoSummary(group),
          group,
          publishedRevision,
          group.every((i) => i.identitySource === 'git-config'),
        ),
    );
  }

  return Array.from(groupBy(installs, (i) => i.agent).entries()).map(
    ([key, group]) =>
      toGroup(
        key,
        key === 'claude-code' ? 'Claude Code' : 'Copilot CLI',
        false,
        repoSummary(group),
        group,
        publishedRevision,
      ),
  );
}

const STATUS_RANK: Record<InstallStatus, number> = {
  behind: 0,
  unknown: 1,
  'up-to-date': 2,
};

export type SortKey = 'name' | 'installs' | 'status' | 'lastSeen';

export function sortGroups(
  groups: AdoptionGroup[],
  key: SortKey,
  direction: 'asc' | 'desc',
): AdoptionGroup[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...groups].sort((a, b) => {
    const primary = compareGroups(a, b, key);
    if (primary !== 0) return primary * factor;
    return a.label.localeCompare(b.label);
  });
}

function compareGroups(
  a: AdoptionGroup,
  b: AdoptionGroup,
  key: SortKey,
): number {
  switch (key) {
    case 'installs':
      return a.installs.length - b.installs.length;
    case 'status':
      return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    case 'lastSeen':
      return a.lastSeenMinutes - b.lastSeenMinutes;
    default:
      return a.label.localeCompare(b.label);
  }
}

export type FlatSortKey = 'repository' | 'person' | 'status' | 'lastSeen';

export function sortInstalls(
  installs: Install[],
  key: FlatSortKey,
  direction: 'asc' | 'desc',
  publishedRevision: string | null,
): Install[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...installs].sort((a, b) => {
    const primary = compareInstalls(a, b, key, publishedRevision);
    if (primary !== 0) return primary * factor;
    return a.personLabel.localeCompare(b.personLabel);
  });
}

function compareInstalls(
  a: Install,
  b: Install,
  key: FlatSortKey,
  publishedRevision: string | null,
): number {
  switch (key) {
    case 'person':
      return a.personLabel.localeCompare(b.personLabel);
    case 'status':
      return (
        STATUS_RANK[statusOf(a, publishedRevision)] -
        STATUS_RANK[statusOf(b, publishedRevision)]
      );
    case 'lastSeen':
      return a.lastSeenMinutes - b.lastSeenMinutes;
    default:
      return repoLabelOf(a).localeCompare(repoLabelOf(b));
  }
}

export function repoLabelOf(install: Install): string {
  if (install.scope === 'user') return 'Machine-wide';
  if (!install.repoResolved || install.repoKey === '') {
    return 'Unidentified repository';
  }
  return install.repoKey;
}

export type AdoptionSummary = {
  installs: number;
  upToDate: number;
  behind: number;
  unknown: number;
  repositories: number;
  people: number;
  agents: Agent[];
};

export function summarize(
  installs: Install[],
  publishedRevision: string | null,
): AdoptionSummary {
  let upToDate = 0;
  let behind = 0;
  let unknown = 0;
  for (const install of installs) {
    const status = statusOf(install, publishedRevision);
    if (status === 'up-to-date') upToDate += 1;
    else if (status === 'behind') behind += 1;
    else unknown += 1;
  }
  return {
    installs: installs.length,
    upToDate,
    behind,
    unknown,
    repositories: distinct(
      installs.filter((i) => i.scope !== 'user').map((i) => i.repoKey),
    ).length,
    people: distinct(installs.map((i) => i.personLabel)).length,
    agents: distinct(installs.map((i) => i.agent)).sort(),
  };
}

export function formatLastSeen(minutes: number): string {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

export function shortRevision(revision: string | null): string {
  if (!revision) return '—';
  return revision.slice(0, 7);
}
