import { marketplacePluginCount } from '@packmind/proprietary/frontend/domain/marketplaces/components/redesign/buildMarketplaceDriftOverview';
import {
  repositoryBehindInstallCount,
  repositoryFailedInstallCount,
  sortRepositoriesByDriftFirst,
} from '../redesign/selectors/buildRepositoryDriftOverview';
import type { MarketplaceDrift, RepositoryDrift } from '../redesign/types';

/**
 * A place this space's packages land in.
 *
 * One type for a git repository and for a marketplace, because the question
 * this surface answers — what is behind, and where — does not care which of the
 * two a thing is. The kind decides the mark, the wording of the count and what
 * repairing it means; everything above that reads a destination.
 */
export type RepositoryDestination = {
  kind: 'repository';
  /** Prefixed: a repo id and a marketplace id are both opaque strings. */
  id: string;
  name: string;
  branch: string;
  /** Landings one distribution would bring up to date. */
  behind: number;
  /** Landings whose last distribution failed. Inside `behind`, not beside it. */
  failed: number;
  /** Packages that land here, for the search. Sorted, unique. */
  packageNames: string[];
  repository: RepositoryDrift;
};

export type MarketplaceDestination = {
  kind: 'marketplace';
  id: string;
  name: string;
  /** Plugins published from this space whose source has moved on. */
  behind: number;
  /**
   * Always zero: the marketplace data records what is drifted, not what a
   * distribution attempt did. Kept on the type so the summary can add the two
   * kinds without asking which one it is holding.
   */
  failed: number;
  packageNames: string[];
  marketplace: MarketplaceDrift;
};

export type Destination = RepositoryDestination | MarketplaceDestination;

/**
 * What state a destination is in, as one word.
 *
 * The three are exclusive, and they resolve in the order the row's own dot
 * already resolves them: a destination whose last distribution failed is behind
 * as well, but the failure is the headline and it is the part a redistribution
 * may not put right on its own.
 *
 * One function rather than a condition written wherever it is needed, because
 * the filter band and the rows have to agree about which of the two a row is:
 * a rail whose pill says `2 failed` and then shows one red row is a rail with a
 * bug in it, and two similar conditions kept in step by hand is how that
 * happens.
 */
export type DestinationStatus = 'aligned' | 'behind' | 'failed';

/** The two the filter band offers. `aligned` is what neither of them selects. */
export type DriftStatus = Exclude<DestinationStatus, 'aligned'>;

export function destinationDriftStatus(
  destination: Destination,
): DestinationStatus {
  if (destination.failed > 0) return 'failed';
  if (destination.behind > 0) return 'behind';
  return 'aligned';
}

export type ReachSummary = {
  destinations: number;
  repositories: number;
  marketplaces: number;
  /** Destinations that are not aligned, whichever of the two ways. */
  needingWork: number;
  /**
   * Destinations, per status, which is the grain the filter band counts in: a
   * pill's number is the number of rows clicking it leaves on screen. The two
   * add up to `needingWork`.
   */
  behindDestinations: number;
  failedDestinations: number;
  /** Landings behind, not destinations: one repository can hold several. */
  behind: number;
  failed: number;
};

/**
 * The destination list of a space: its repositories, then the marketplaces it
 * publishes to.
 *
 * Repositories first and marketplaces second rather than interleaved by how bad
 * things are. Not because one of them cannot be acted on — the batch takes
 * both — but because what reaching them costs differs: a repository takes a
 * commit on its branch, a marketplace takes a pull request someone has to
 * merge. Grouped, the reader can see how much of a pick is which.
 *
 * Inside each kind the order is what needs work first, which is the difference
 * with the Context rail: that one is entered with a name in mind and keeps a
 * stable alphabetical order, this one is entered because a number said
 * something is behind somewhere and the user does not know where.
 *
 * Marketplaces with nothing outdated are here too, with a count of zero, the
 * same as a repository that is up to date. They used to be absent, because the
 * list behind them was a drift report rather than the catalogs a space
 * publishes to, so a row appeared when it broke and vanished when it was fixed.
 * `useSpaceMarketplaces` answers the membership question instead.
 */
export function buildSpaceDestinations(
  repositories: readonly RepositoryDrift[],
  marketplaces: readonly MarketplaceDrift[],
): Destination[] {
  const repositoryRows: Destination[] = sortRepositoriesByDriftFirst([
    ...repositories,
  ]).map((repository) => ({
    kind: 'repository',
    id: `r:${repository.id}`,
    name: `${repository.repo.owner}/${repository.repo.name}`,
    branch: repository.branch,
    behind: repositoryBehindInstallCount(repository),
    failed: repositoryFailedInstallCount(repository),
    packageNames: uniqueSorted(
      repository.targets.flatMap((target) =>
        target.packages.map((pkg) => pkg.name),
      ),
    ),
    repository,
  }));

  const marketplaceRows: Destination[] = [...marketplaces]
    .sort(
      (a, b) =>
        marketplacePluginCount(b) - marketplacePluginCount(a) ||
        a.name.localeCompare(b.name),
    )
    .map((marketplace) => ({
      kind: 'marketplace',
      id: `m:${marketplace.id}`,
      name: marketplace.name,
      behind: marketplacePluginCount(marketplace),
      failed: 0,
      packageNames: uniqueSorted(marketplace.publishedPackageNames),
      marketplace,
    }));

  return [...repositoryRows, ...marketplaceRows];
}

/**
 * What the whole surface is worth in one line, over the destinations it is
 * showing rather than over the raw queries: the header and the rail then cannot
 * disagree about how much is behind.
 */
export function destinationReachSummary(
  destinations: readonly Destination[],
): ReachSummary {
  let repositories = 0;
  let marketplaces = 0;
  let behindDestinations = 0;
  let failedDestinations = 0;
  let behind = 0;
  let failed = 0;

  for (const destination of destinations) {
    if (destination.kind === 'repository') repositories += 1;
    else marketplaces += 1;
    const status = destinationDriftStatus(destination);
    if (status === 'behind') behindDestinations += 1;
    else if (status === 'failed') failedDestinations += 1;
    behind += destination.behind;
    failed += destination.failed;
  }

  return {
    destinations: destinations.length,
    repositories,
    marketplaces,
    /*
     * Counted from the status rather than from `behind > 0`, which is what this
     * used to be. A destination reporting a failure and nothing behind is a
     * shape the data allows, and it used to show a red row that this number did
     * not include: the rail said everything was aligned above a row saying it
     * was not.
     */
    needingWork: behindDestinations + failedDestinations,
    behindDestinations,
    failedDestinations,
    behind,
    failed,
  };
}

/**
 * Whether this destination can be picked for the rail's batch repair.
 *
 * Both kinds, now that one verb covers both. It was repositories only, back
 * when the marketplace half of a pick had nowhere to go: the batch handed its
 * work to a confirmation surface that only knew how to write a package into a
 * repository, so a checkbox on a catalog would have done nothing. That surface
 * takes catalogs too, and it states the two mechanisms apart, which is the part
 * that made the difference worth keeping.
 */
export function isBatchDistributable(destination: Destination): boolean {
  return destination.behind > 0;
}

export type DestinationMatch = {
  destination: Destination;
  /**
   * The packages of this destination the query reached. Empty when nothing is
   * typed, and empty when only the destination's own name carried the match.
   */
  matchedPackages: string[];
};

export type DestinationSearchResult = {
  rows: DestinationMatch[];
  /** Trimmed and folded, for the callers that mark the matched fragment. */
  needle: string;
};

/**
 * The rail's list for a given query.
 *
 * Package names are in the index on purpose: nobody remembers a branch name,
 * everybody remembers what they shipped, and "where did Backend land" is the
 * question this surface exists to answer read from the other end.
 */
export function searchDestinations(
  destinations: readonly Destination[],
  query: string,
): DestinationSearchResult {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return {
      rows: destinations.map((destination) => ({
        destination,
        matchedPackages: [],
      })),
      needle,
    };
  }

  const rows: DestinationMatch[] = [];
  for (const destination of destinations) {
    const named = `${destination.name} ${
      destination.kind === 'repository' ? destination.branch : ''
    }`
      .toLowerCase()
      .includes(needle);
    const matchedPackages = destination.packageNames.filter((name) =>
      name.toLowerCase().includes(needle),
    );
    if (named || matchedPackages.length > 0) {
      rows.push({ destination, matchedPackages });
    }
  }

  return { rows, needle };
}

function uniqueSorted(names: readonly string[]): string[] {
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}
