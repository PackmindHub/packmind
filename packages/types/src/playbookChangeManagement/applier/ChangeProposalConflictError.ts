import { DomainError } from '../../errors';
import { ChangeProposalId } from '../ChangeProposalId';
import { MergeConflictRegion } from './IChangeProposalMerger';

/**
 * The proposal no longer applies cleanly on top of the artefact's current
 * content: the current state rules the change out, so `conflict`. The message
 * reaches the reviewer verbatim, so the id stays in `context`.
 */
export class ChangeProposalConflictError extends Error implements DomainError {
  readonly kind = 'conflict' as const;
  readonly reason = 'change_proposal_conflict' as const;
  readonly context: { changeProposalId: ChangeProposalId };

  constructor(
    changeProposalId: ChangeProposalId,
    public readonly regions: MergeConflictRegion[] = [],
  ) {
    super(
      "One of the accepted changes conflicts with the current content and can't be applied. Reject it, or ask its author to submit it again.",
    );
    this.name = 'ChangeProposalConflictError';
    this.context = { changeProposalId };
  }
}
