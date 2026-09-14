import { DistributionStatus } from '@packmind/types';
import {
  multiLandingRepoIds,
  targetLabel,
  type DriftArtifactEntry,
  type InstallDriftEntry,
} from '../redesign/selectors/installDriftEntries';

/**
 * Where a package has got to, as one list.
 *
 * The two halves of a package's Distribution tab used to be two panes behind
 * two chips: the repositories it is installed in on one side, the marketplaces
 * it is published to on the other. They answer one question, "where is this and
 * what is stale there", and a reader holding that question had to ask it twice
 * and add up the answers.
 *
 * The grain is the landing, not the repository. A package installed on the root
 * and on `apps/frontend` of one repository is two rows, because a push acts on
 * one of them at a time and the drift of the two is not the same fact. This is
 * the difference with `buildSpaceDestinations`, which lists a space's reach and
 * so counts repositories.
 */

/**
 * What a destination needs from its reader, as one word.
 *
 * Ranked, and the order is the one the rows are sorted in: a failure is the
 * headline over anything else, and `waiting` outranks `behind` because the two
 * can hold at once and only one of them can be acted on. That rule is not new
 * here: `MarketplacePluginDrift.lastStatus` already states it for a plugin
 * riding an open sync PR, where the republish has happened, the copy is still
 * outdated, and reading it as plain drift made the rail offer to publish a
 * second time.
 */
export type PackageDestinationState =
  | 'failed'
  | 'waiting'
  | 'behind'
  | 'aligned';

const STATE_RANK: Record<PackageDestinationState, number> = {
  failed: 0,
  waiting: 1,
  behind: 2,
  aligned: 3,
};

/** The states that put a row in the band at the top. */
export function needsAHand(state: PackageDestinationState): boolean {
  return state !== 'aligned';
}

/**
 * One marketplace this package stands on, in the terms this file works in.
 *
 * A shape of its own rather than the marketplaces domain's `MarketplacePublication`,
 * so this file imports nothing from an edition that only one of the two
 * repositories has. The proprietary pane maps its publications into this; the
 * Open Source one passes an empty list and gets its repositories back.
 */
export type PackagePublication = {
  /** The marketplace's id, opaque and only used to key the row. */
  id: string;
  name: string;
  /** Whether what is published there is behind the package as it stands now. */
  isOutdated: boolean;
  /**
   * What became of the last publish attempt. `waiting` covers both a run still
   * going and a republish sitting on the rolling sync PR: in either case the
   * work is done and what is left is not the reader's to do.
   */
  lastAttempt: 'landed' | 'waiting' | 'failed';
  /** The pull request a waiting publication is riding on, when there is one. */
  prUrl: string | null;
  lastActivityAt: string | null;
};

export type PackageDestination = {
  /** Unique across both kinds, which share no id space. */
  key: string;
  kind: 'repository' | 'marketplace';
  /** `owner/repo`, or the marketplace's name. */
  name: string;
  /**
   * What tells this landing from another of the same name: the branch, and the
   * target when the repository holds more than one. A repository reached in a
   * single place is named by its name alone, which is the rule
   * `multiLandingRepoIds` was written for.
   */
  details: string[];
  state: PackageDestinationState;
  /**
   * The components of this package that are late here, which is what the row
   * names and what its expansion lists.
   *
   * Empty for a marketplace, and that is a gap in the data rather than a claim:
   * the plugin drift says a published copy has been overtaken, not which
   * components did the overtaking. `behindCount` is zero there while the state
   * still reads `behind`, so nothing prints "0 components behind".
   */
  behindArtifacts: readonly DriftArtifactEntry[];
  behindCount: number;
  /**
   * The key the redistribute flow works in, `repoId::targetId`. Null for a
   * marketplace, which is republished rather than pushed to.
   */
  installKey: string | null;
  prUrl: string | null;
  lastActivityAt: string | null;
};

export type PackageDestinationSummary = {
  all: number;
  repositories: number;
  marketplaces: number;
  /** Not aligned, whichever of the three ways. */
  needsAHand: number;
  upToDate: number;
};

/**
 * Every place this package stands, worst first.
 *
 * Repositories and marketplaces are interleaved rather than grouped by kind,
 * which is where this parts company with `buildSpaceDestinations`. That list is
 * entered to pick a batch, and what reaching a repository costs differs from
 * what reaching a catalog costs, so the two are worth separating there. This
 * one is entered to find what is wrong, the band is the grouping, and the kind
 * is one chip away for the reader who wants it back.
 */
export function buildPackageDestinations({
  installs,
  publications = [],
}: Readonly<{
  installs: readonly InstallDriftEntry[];
  publications?: readonly PackagePublication[];
}>): PackageDestination[] {
  const multiLanding = multiLandingRepoIds(installs);

  const rows: PackageDestination[] = [
    ...installs.map((entry) => repositoryRow(entry, multiLanding)),
    ...publications.map(marketplaceRow),
  ];

  /*
   * Two comparisons and no more, because everything below them has already been
   * decided upstream: `installDriftEntries` orders the landings, root target
   * first and then by name, and the caller orders its publications. `sort` is
   * stable, so rows the two comparisons call equal come out in the order they
   * went in, which keeps repositories ahead of marketplaces inside a band and
   * spares this file a third opinion about how to spell a tie.
   */
  return rows.sort(
    (a, b) =>
      STATE_RANK[a.state] - STATE_RANK[b.state] ||
      b.behindCount - a.behindCount,
  );
}

function repositoryRow(
  entry: InstallDriftEntry,
  multiLanding: ReadonlySet<string>,
): PackageDestination {
  const details = [entry.branch];
  if (multiLanding.has(entry.repo.id)) details.push(targetLabel(entry.target));

  return {
    key: `r:${entry.repo.id}::${entry.target.id}`,
    kind: 'repository',
    name: `${entry.repo.owner}/${entry.repo.name}`,
    details,
    state: repositoryState(entry),
    behindArtifacts: entry.behindArtifacts,
    behindCount: entry.behindArtifacts.length,
    installKey: `${entry.repo.id}::${entry.target.id}`,
    prUrl: null,
    lastActivityAt: entry.lastDistributedAt ?? entry.mostRecentDeployedAt,
  };
}

/**
 * Read from the last distribution's status and from the drift, in that order.
 *
 * `in_progress` outranks the drift for the reason the marketplace's
 * `pending_merge` does: a push is on its way, and a row offering to start a
 * second one is offering to do the work twice.
 */
function repositoryState(entry: InstallDriftEntry): PackageDestinationState {
  if (entry.lastDistributionStatus === DistributionStatus.failure) {
    return 'failed';
  }
  if (entry.lastDistributionStatus === DistributionStatus.in_progress) {
    return 'waiting';
  }
  return entry.behindArtifacts.length > 0 ? 'behind' : 'aligned';
}

function marketplaceRow(publication: PackagePublication): PackageDestination {
  return {
    key: `m:${publication.id}`,
    kind: 'marketplace',
    name: publication.name,
    details: [],
    state:
      publication.lastAttempt === 'failed'
        ? 'failed'
        : publication.lastAttempt === 'waiting'
          ? 'waiting'
          : publication.isOutdated
            ? 'behind'
            : 'aligned',
    behindArtifacts: [],
    behindCount: 0,
    installKey: null,
    prUrl: publication.prUrl,
    lastActivityAt: publication.lastActivityAt,
  };
}

/**
 * The readings the chip row offers, one at a time.
 *
 * Two axes in one row, and picking one drops the other. It reads as five ways
 * to narrow the same list rather than as a grid, which is what the reader is
 * actually after: "the marketplaces" and "what needs a hand" are each a whole
 * question, and someone who wants the marketplaces that need a hand has at most
 * a handful of rows left to read by then. A second row of chips to express the
 * crossing would cost every reader a line to spare that one a glance.
 */
export type PackageDestinationFilter =
  | 'all'
  | 'repositories'
  | 'marketplaces'
  | 'needs-a-hand'
  | 'up-to-date';

export function filterPackageDestinations(
  destinations: readonly PackageDestination[],
  filter: PackageDestinationFilter,
): PackageDestination[] {
  switch (filter) {
    case 'repositories':
      return destinations.filter((row) => row.kind === 'repository');
    case 'marketplaces':
      return destinations.filter((row) => row.kind === 'marketplace');
    case 'needs-a-hand':
      return destinations.filter((row) => needsAHand(row.state));
    case 'up-to-date':
      return destinations.filter((row) => !needsAHand(row.state));
    default:
      return [...destinations];
  }
}

/**
 * What the chip row counts. Taken from the rows rather than from the queries
 * behind them, so a chip cannot say five where the list shows four.
 */
export function packageDestinationSummary(
  destinations: readonly PackageDestination[],
): PackageDestinationSummary {
  let repositories = 0;
  let marketplaces = 0;
  let needing = 0;

  for (const destination of destinations) {
    if (destination.kind === 'repository') repositories += 1;
    else marketplaces += 1;
    if (needsAHand(destination.state)) needing += 1;
  }

  return {
    all: destinations.length,
    repositories,
    marketplaces,
    needsAHand: needing,
    upToDate: destinations.length - needing,
  };
}
