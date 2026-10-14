import type {
  Destination,
  DestinationState,
  PackageSnapshot,
  Scenario,
} from './types';

/**
 * Names chosen to stress the layout rather than to fill it: one repository long
 * enough to wrap a column, one short enough to look sparse beside it, branches
 * that are not all `main`, and marketplaces sitting as peers among the repos
 * because that is what the production list does.
 */
const REPOS: ReadonlyArray<{ name: string; detail: string }> = [
  { name: 'acme-corp/web', detail: 'main · .claude/' },
  {
    name: 'acme-corp/internal-platform-services-gateway',
    detail: 'release/2026.04 · packages/gateway/.claude/',
  },
  { name: 'acme-corp/mobile-ios', detail: 'main · .claude/' },
  { name: 'data-platform/etl-jobs', detail: 'develop · .claude/' },
  { name: 'acme-corp/design-system', detail: 'main · .claude/' },
  { name: 'acme-corp/billing', detail: 'main · services/billing/.claude/' },
  { name: 'infra/terraform-modules', detail: 'main · .claude/' },
  { name: 'acme-corp/docs', detail: 'main · .claude/' },
];

const MARKETPLACES: ReadonlyArray<{ name: string; detail: string }> = [
  { name: 'Acme internal marketplace', detail: 'Claude Code · private' },
  { name: 'Frontend guild marketplace', detail: 'Claude Code · org-wide' },
];

function repository(
  index: number,
  state: DestinationState,
  version: string,
  extra: Partial<Destination> = {},
): Destination {
  const repo = REPOS[index % REPOS.length];
  return {
    id: `repo-${index}`,
    kind: 'repository',
    name: repo.name,
    detail: repo.detail,
    state,
    version,
    canReleaseAndUpdate: false,
    ...extra,
  };
}

function marketplace(
  index: number,
  state: DestinationState,
  version: string,
  extra: Partial<Destination> = {},
): Destination {
  const place = MARKETPLACES[index % MARKETPLACES.length];
  return {
    id: `mkt-${index}`,
    kind: 'marketplace',
    name: place.name,
    detail: place.detail,
    state,
    version,
    canReleaseAndUpdate: false,
    ...extra,
  };
}

/**
 * 240 landings of which four need something. The fold in the list is what makes
 * this readable, and an approach that only works at six rows should fail here
 * visibly rather than quietly.
 */
function atScale(): Destination[] {
  const noisy: Destination[] = [
    repository(1, 'drifted', '1.3.0'),
    repository(3, 'behind', '1.2.0'),
    repository(5, 'failed', '1.3.0', {
      note: 'No write access to release/2026.04.',
    }),
    marketplace(0, 'behind', '1.3.0'),
  ];
  const quiet = Array.from({ length: 236 }, (_, i) =>
    repository(i + 10, 'up-to-date', '1.4.0'),
  ).map((destination, i) => ({
    ...destination,
    id: `bulk-${i}`,
    name: `${destination.name}-${i + 1}`,
  }));
  return [...noisy, ...quiet];
}

export function snapshotFor(scenario: Scenario): PackageSnapshot {
  const base = {
    name: 'Frontend conventions',
    description:
      'Naming, component structure and testing rules the web squads follow. Read by the agents working in each repository.',
    componentCount: 14,
  };

  switch (scenario) {
    case 'nowhere':
      return {
        ...base,
        currentVersion: null,
        changesSinceRelease: 14,
        destinations: [],
      };

    case 'aligned':
      return {
        ...base,
        currentVersion: '1.4.0',
        changesSinceRelease: 0,
        destinations: [
          repository(0, 'up-to-date', '1.4.0'),
          repository(1, 'up-to-date', '1.4.0'),
          repository(2, 'up-to-date', '1.4.0'),
          repository(3, 'up-to-date', '1.4.0'),
          marketplace(0, 'up-to-date', '1.4.0'),
          repository(4, 'up-to-date', '1.4.0'),
        ],
      };

    case 'behind':
      return {
        ...base,
        currentVersion: '1.4.0',
        changesSinceRelease: 0,
        destinations: [
          repository(0, 'behind', '1.2.0'),
          repository(1, 'behind', '1.3.0'),
          marketplace(0, 'behind', '1.3.0'),
          repository(2, 'up-to-date', '1.4.0'),
          repository(3, 'up-to-date', '1.4.0'),
          repository(4, 'up-to-date', '1.4.0'),
          repository(5, 'up-to-date', '1.4.0'),
          repository(6, 'up-to-date', '1.4.0'),
          marketplace(1, 'up-to-date', '1.4.0'),
        ],
      };

    case 'unreleased':
      /*
       * The hinge case. Four components moved since 1.4.0 was cut, so the rows
       * carrying live content are drifted rather than behind, and the act that
       * actually unblocks them is a release — which is precisely the act the
       * header has no room for today.
       */
      return {
        ...base,
        currentVersion: '1.4.0',
        changesSinceRelease: 4,
        destinations: [
          repository(0, 'drifted', '1.4.0', { canReleaseAndUpdate: true }),
          repository(1, 'drifted', '1.4.0', { canReleaseAndUpdate: true }),
          repository(2, 'behind', '1.1.0'),
          repository(3, 'behind', '1.3.0'),
          repository(4, 'up-to-date', '1.4.0'),
          marketplace(0, 'up-to-date', '1.4.0'),
          repository(5, 'up-to-date', '1.4.0'),
        ],
      };

    case 'failing':
      return {
        ...base,
        currentVersion: '1.4.0',
        changesSinceRelease: 0,
        destinations: [
          repository(1, 'failed', '1.2.0', {
            note: 'No write access to release/2026.04. Reconnect the GitHub App.',
          }),
          repository(3, 'failed', '1.0.0', {
            note: 'Branch develop is protected and the push was rejected.',
          }),
          repository(0, 'behind', '1.3.0'),
          repository(2, 'behind', '1.3.0'),
          marketplace(0, 'waiting', '1.3.0'),
          repository(4, 'up-to-date', '1.4.0'),
          repository(5, 'up-to-date', '1.4.0'),
          repository(6, 'up-to-date', '1.4.0'),
          repository(7, 'up-to-date', '1.4.0'),
          marketplace(1, 'up-to-date', '1.4.0'),
        ],
      };

    case 'scale':
      return {
        ...base,
        currentVersion: '1.4.0',
        changesSinceRelease: 0,
        destinations: atScale(),
      };
  }
}

export function needsAHand(state: DestinationState): boolean {
  return state !== 'up-to-date';
}

/** What a corrective push would reach: everything not already current. */
export function pendingDestinations(
  destinations: readonly Destination[],
): Destination[] {
  return destinations.filter((destination) => needsAHand(destination.state));
}

export const STATE_LABEL: Record<DestinationState, string> = {
  'up-to-date': 'Up to date',
  behind: 'Behind',
  drifted: 'Drifted',
  waiting: 'Waiting',
  failed: 'Failed',
};

export const STATE_TONE: Record<DestinationState, string> = {
  'up-to-date': 'green.400',
  behind: 'orange.400',
  drifted: 'orange.400',
  waiting: 'blue.400',
  failed: 'red.400',
};

/** The next version a cut would produce, for the release control's label. */
export function nextVersion(current: string | null): string {
  if (!current) return '0.1.0';
  const [major, minor] = current.split('.');
  return `${major}.${Number(minor) + 1}.0`;
}
