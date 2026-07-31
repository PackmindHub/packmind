import { ChangeProposalId } from './ChangeProposalId';

/**
 * A single unresolved region when a proposal is merged against the projected
 * artefact (HEAD + currently-selected proposals). The three competing texts
 * are pre-computed so a future 3-pane resolver can render them directly.
 */
export type ProposalMergeConflictRegion = {
  /** The change type the conflict is on (e.g. "update-standard-name"). */
  field: string;
  /** The collection-item id, for collection-item proposals. */
  targetId?: string;
  base: string;
  ours: string;
  theirs: string;
};

/**
 * A proposal's diff rebased onto the projected artefact (HEAD + the
 * currently-selected proposals). `before` is the projected content of the field
 * the proposal targets; `after` is the 3-way merge result — i.e. exactly what
 * applying the proposal would produce.
 *
 * The review UI must render this instead of the `oldValue`/`newValue` snapshot
 * frozen into the payload at creation time: once HEAD moves, that snapshot
 * shows a stale "before" *and* an "after" that silently drops whatever else
 * landed in between.
 *
 * Absent for proposals that never go through a field merge (collection
 * add/delete, JSON overwrites), whose payload snapshot is already truthful.
 */
export type ProposalRebasedDiff = {
  before: string;
  after: string;
};

/**
 * The result of merging a single proposal against the projected artefact.
 * `mergeable` — the proposal applies cleanly on top of the current selection.
 * `conflict`  — the proposal would conflict; it is blocked / flagged outdated.
 */
export type ProposalMergeVerdict =
  | { state: 'mergeable'; rebased?: ProposalRebasedDiff }
  | { state: 'conflict'; regions: ProposalMergeConflictRegion[] };

export type ProposalMergeVerdictMap = Record<
  ChangeProposalId,
  ProposalMergeVerdict
>;
