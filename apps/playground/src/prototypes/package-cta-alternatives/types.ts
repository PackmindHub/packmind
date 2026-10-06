/**
 * The question this prototype is about: the package pane header carries one
 * primary control whose wording changes with the package's state — `Distribute`
 * when it stands nowhere, `Distribute` again when it is current everywhere,
 * `Update 3 destinations` when some are behind. Three sentences, one slot, and
 * a reader who has to work out which one is theirs.
 *
 * If that control moves down to the Distribution tab, where the verbs it
 * carries already belong, the header's loudest slot falls empty. These are the
 * candidates for it, each one a different answer to "what does this header do".
 */
export type HeaderApproach =
  /** The status quo, kept so the alternatives can be read against something. */
  | 'today'
  /** The header stops acting. Every verb belongs to the tab that answers it. */
  | 'none'
  /** The one act that belongs to neither tab, promoted out of the version bar. */
  | 'release'
  /** A fact instead of a verb: where the package reaches, linking to the proof. */
  | 'reach'
  /** The hand-off — the CLI snippet, pulled out of the Distribute popover. */
  | 'install';

/**
 * The states the header CTA changes its wording for. Switching between them is
 * the whole point: an approach that reads well on a healthy package and badly
 * on a drifting one has not answered the question.
 */
export type Scenario =
  /** Never distributed. The one state where discoverability is everything. */
  | 'nowhere'
  /** Distributed and current. The state with nothing to do. */
  | 'aligned'
  /** Three destinations behind. Where `Update N` earns its place today. */
  | 'behind'
  /** Components moved since the last cut, and two destinations behind it. */
  | 'unreleased'
  /** Two failures beside three drifted rows: two different hands needed. */
  | 'failing'
  /** 240 landings, four of which need something. The density stress test. */
  | 'scale';

export type DestinationState =
  | 'up-to-date'
  | 'behind'
  | 'drifted'
  | 'waiting'
  | 'failed';

export type DestinationKind = 'repository' | 'marketplace';

export interface Destination {
  id: string;
  kind: DestinationKind;
  /** `owner/repo` for a repository, the marketplace's name otherwise. */
  name: string;
  /** Branch and path, or the channel the marketplace publishes on. */
  detail: string;
  state: DestinationState;
  /** What this destination currently holds. */
  version: string;
  /** Why it failed, for the rows that did. */
  note?: string;
  /**
   * Whether cutting a release would move this row forward. True for a landing
   * sitting on live content that has changed since the last version was cut —
   * the rows `Release & Update` is for.
   */
  canReleaseAndUpdate: boolean;
}

export interface PackageSnapshot {
  name: string;
  description: string;
  componentCount: number;
  /** Null when the package has never been released. */
  currentVersion: string | null;
  /** Components that moved since that version was cut. */
  changesSinceRelease: number;
  destinations: Destination[];
}

/** What the prototype has done so far, so an action is visibly an action. */
export interface LogEntry {
  id: number;
  text: string;
}
