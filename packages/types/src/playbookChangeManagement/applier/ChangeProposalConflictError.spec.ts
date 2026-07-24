import { ChangeProposalConflictError } from './ChangeProposalConflictError';
import { createChangeProposalId } from '../ChangeProposalId';
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

    it('builds the conflict message', () => {
      const error = new ChangeProposalConflictError(changeProposalId);

      expect(error.message).toBe(
        `Change proposal "${changeProposalId}" conflicts with the current value and cannot be applied without force`,
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
