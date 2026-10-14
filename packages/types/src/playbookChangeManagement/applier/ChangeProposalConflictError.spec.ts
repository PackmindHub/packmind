import { ChangeProposalConflictError } from './ChangeProposalConflictError';
import { createChangeProposalId } from '../ChangeProposalId';
import { isDomainError } from '../../errors';
import { MergeConflictRegion } from './IChangeProposalMerger';

describe('ChangeProposalConflictError', () => {
  const changeProposalId = createChangeProposalId('cp-1');

  describe('when no regions are provided', () => {
    it('defaults regions to an empty array', () => {
      const error = new ChangeProposalConflictError(changeProposalId);

      expect(error.regions).toEqual([]);
    });

    it('sets the error name', () => {
      const error = new ChangeProposalConflictError(changeProposalId);

      expect(error.name).toBe('ChangeProposalConflictError');
    });

    it('is a conflict domain error', () => {
      const error = new ChangeProposalConflictError(changeProposalId);

      expect(isDomainError(error)).toBe(true);
    });

    it('answers with the conflict kind', () => {
      const error = new ChangeProposalConflictError(changeProposalId);

      expect(error.kind).toBe('conflict');
    });

    it('carries the change_proposal_conflict reason', () => {
      const error = new ChangeProposalConflictError(changeProposalId);

      expect(error.reason).toBe('change_proposal_conflict');
    });

    it('carries the change proposal id in its context', () => {
      const error = new ChangeProposalConflictError(changeProposalId);

      expect(error.context).toEqual({ changeProposalId });
    });

    it('keeps the change proposal id out of the message', () => {
      const error = new ChangeProposalConflictError(changeProposalId);

      expect(error.message).not.toContain(changeProposalId);
    });

    it('builds the conflict message', () => {
      const error = new ChangeProposalConflictError(changeProposalId);

      expect(error.message).toBe(
        "One of the accepted changes conflicts with the current content and can't be applied. Reject it, or ask its author to submit it again.",
      );
    });
  });

  describe('when regions are provided', () => {
    it('carries the provided conflict regions', () => {
      const region: MergeConflictRegion = {
        base: 'base',
        ours: 'ours',
        theirs: 'theirs',
      };

      const error = new ChangeProposalConflictError(changeProposalId, [region]);

      expect(error.regions).toEqual([region]);
    });
  });
});
