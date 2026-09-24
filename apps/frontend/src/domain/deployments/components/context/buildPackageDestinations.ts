import { differenceInDays } from 'date-fns';
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

/**
 * The colour of each state, beside the states themselves so a dot, a band and
 * a summary line cannot drift apart on what orange means.
 */
export const STATE_TONE: Record<PackageDestinationState, string> = {
  failed: 'red.300',
  waiting: 'blue.300',
  behind: 'orange.500',
  aligned: 'green.500',
};

/**
 * How long a report stands for the present, in days.
 *
 * Nothing in Packmind re-reads a branch. `Up to date` is not an observation,
 * it is the memory of one, and it holds unchanged until someone pushes again,
 * however many weeks that takes. Inside a fortnight a landing has plausibly not
 * moved and the memory still passes for a reading; past it the row is making a
 * claim about a branch nobody has looked at since.
 *
 * One number rather than a scale, because the reader is not being asked to rank
 * ages against each other. They are being asked whether to trust one sentence,
 * and that is a yes or a no.
 */
export const STALE_REPORT_DAYS = 14;

/**
 * Whether a date has outlived the claim it backs.
 *
 * A missing date is not stale. There is nothing to name, and the rule everywhere
 * below is that the mark never fades without copy that says how old the reading
 * is: a faded dot on its own is a worry the row cannot explain.
 */
export function isReportStale(lastActivityAt: string | null): boolean {
  if (!lastActivityAt) return false;
  const reported = new Date(lastActivityAt);
  if (Number.isNaN(reported.getTime())) return false;
  return differenceInDays(new Date(), reported) > STALE_REPORT_DAYS;
}

/**
 * The colour a row's mark takes, which is its state and then its age.
 *
 * Here rather than in the components, so the dot in the list and any other
 * mark standing for the same row cannot end up two different greens. Callers
 * that hold a state and no row still read `STATE_TONE` directly; this is for
 * the ones that hold the row, because age is a fact about the row.
 *
 * Only `aligned` is qualified. The other three name something that happened
 * (a push failed, a push is running, a copy was overtaken), and an event does
 * not go out of date; only a claim about the present can. Fading a red `failed`
 * dot would cost this surface the one mark that has to keep its force at any
 * age, which is why age never reaches it.
 *
 * It loses its colour rather than its light, and `beige.500` is the neutral
 * twin of `green.500`: the same luminance to the thousandth, so the same 3.67
 * against the row behind it. The dot keeps every bit of its weight and only its
 * hue goes, which is the distinction the eye makes without being asked.
 *
 * Darkening was tried first and does not survive 6px on a dark row. The two
 * demands pull against each other: a green far enough from `green.500` to be
 * told apart is already too close to the background to be seen at all.
 * `green.600` measured 1.39 between the two greens, `green.700` 1.93 but only
 * 1.90 against the row, `green.800` vanished outright. There is no value on
 * that scale to pick, which is why this one leaves the scale.
 *
 * It does not hollow either. A ring was the other way to say "this is less
 * certain", and it says the wrong thing here: an outlined dot reads as empty,
 * and empty on this list already means nothing has landed there, which is a
 * different and false claim. At 6px it does not read as a ring at all.
 */
export function destinationTone(destination: PackageDestination): string {
  return destination.state === 'aligned' && destination.hasStaleReport
    ? 'beige.500'
    : STATE_TONE[destination.state];
}

/**
 * The day a report was made, short and absolute.
 *
 * Absolute because these are read down a column and compared across rows: "3
 * weeks ago" and "a month ago" cannot be put in order by eye, and two rows
 * reported the same day should look the same.
 *
 * The year appears only when it is not this one. A bare "28 Nov" read in
 * September is spontaneously taken for a date still to come, and it is on the
 * oldest reports of all that this line most has to be plain. Within the current
 * year the year is noise, and the sentence it joins is already a sentence.
 */
export function reportDay(iso: string): string {
  const reported = new Date(iso);
  const day = reported.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  return reported.getFullYear() === new Date().getFullYear()
    ? day
    : `${day} ${reported.getFullYear()}`;
}

/**
 * The same report in full, for the title the short day hangs under.
 *
 * Spelled out here rather than taken from `RelativeDate`, which holds the same
 * format inside a component: what is needed here is a string to put on a
 * `title`, not an element, and the two callers of it are a selector's
 * sentence and a strip's line.
 */
export function reportInstant(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * The worst state in a set, which is what a single mark standing for many of
 * them has to show. Ranked exactly as the rows are sorted, so the mark agrees
 * with whatever is at the top of the list it summarises.
 */
export function worstState(
  destinations: readonly PackageDestination[],
): PackageDestinationState {
  return destinations.reduce<PackageDestinationState>(
    (worst, destination) =>
      STATE_RANK[destination.state] < STATE_RANK[worst]
        ? destination.state
        : worst,
    'aligned',
  );
}

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
   * Whether pushing this destination would send anything.
   *
   * A field rather than `behindCount > 0`, because the two kinds know their own
   * lateness differently: a landing knows which components are late, a
   * published copy only knows it has been overtaken. Reading the count would
   * make every marketplace look up to date to whatever offers the gesture.
   */
  hasWorkToSend: boolean;
  /**
   * The key the redistribute flow works in, `repoId::targetId`. Null for a
   * marketplace, which is republished rather than pushed to.
   */
  installKey: string | null;
  prUrl: string | null;
  lastActivityAt: string | null;
  /**
   * Whether `lastActivityAt` is old enough for the row to say so.
   *
   * Computed once, here, rather than left to whatever renders the row: a dot
   * and a sentence that each ran their own date arithmetic would eventually
   * disagree on the same destination, and the one thing this rule cannot afford
   * is a faded mark beside copy that claims to be current.
   */
  hasStaleReport: boolean;
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

  const lastActivityAt = entry.lastDistributedAt ?? entry.mostRecentDeployedAt;

  return {
    key: `r:${entry.repo.id}::${entry.target.id}`,
    kind: 'repository',
    name: `${entry.repo.owner}/${entry.repo.name}`,
    details,
    state: repositoryState(entry),
    behindArtifacts: entry.behindArtifacts,
    behindCount: entry.behindArtifacts.length,
    hasWorkToSend: entry.behindArtifacts.length > 0,
    installKey: `${entry.repo.id}::${entry.target.id}`,
    prUrl: null,
    lastActivityAt,
    hasStaleReport: isReportStale(lastActivityAt),
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
    /*
     * The copy has been overtaken, whatever became of the last attempt. A
     * publish that failed left it outdated too, and republishing is how that
     * one is retried.
     */
    hasWorkToSend: publication.isOutdated,
    installKey: null,
    prUrl: publication.prUrl,
    lastActivityAt: publication.lastActivityAt,
    hasStaleReport: isReportStale(publication.lastActivityAt),
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
 * The destinations a typed name reaches.
 *
 * Name and details, which is owner, repository, branch and target. Nobody
 * remembers a target path, everybody remembers the repository they broke, and
 * at three hundred landings the search is the only way to reach one in
 * particular: the bands answer "what is wrong", and this answers "what about
 * this one".
 *
 * It reads the whole set, including what is folded away as up to date. A search
 * that only looked at the rows already on screen would answer "no" about a
 * repository the reader can see the count of.
 *
 * What it reads is exactly what a row shows, which is why the target only
 * counts where `details` carries it: on a repository reached in one place the
 * landing has no label, and a row coming back for a word the reader cannot find
 * anywhere on it is a result they have to take on trust.
 */
export function searchPackageDestinations(
  destinations: readonly PackageDestination[],
  query: string,
): PackageDestination[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...destinations];

  return destinations.filter((row) =>
    [row.name, ...row.details].some((field) =>
      field.toLowerCase().includes(needle),
    ),
  );
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

/**
 * The oldest report among the destinations whose age is worth naming.
 *
 * What a one-line roll-up needs, and the counterpart of `worstState`: a
 * sentence standing for eleven destinations has to stand for the weakest of
 * them, and for a set that is entirely aligned the weakest is the one nobody
 * has heard from in longest.
 *
 * Null when every report is recent, or when none of them carries a date, which
 * is the same answer the line wants in both cases: say nothing about age.
 */
export function oldestStaleReport(
  destinations: readonly PackageDestination[],
): string | null {
  let oldest: string | null = null;
  let oldestAt = Number.POSITIVE_INFINITY;

  for (const destination of destinations) {
    if (!destination.hasStaleReport || !destination.lastActivityAt) continue;
    const at = new Date(destination.lastActivityAt).getTime();
    if (at < oldestAt) {
      oldestAt = at;
      oldest = destination.lastActivityAt;
    }
  }

  return oldest;
}
