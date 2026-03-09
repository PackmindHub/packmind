import {
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalType,
} from '@packmind/types';
import { DiffService } from './DiffService';
import { getConflictDetector } from './conflictDetection/getConflictDetector';
import { SetMultimap } from '@teppeis/multimaps';

export class ConflictDetectionService {
  constructor(private readonly diffService: DiffService) {}

  detectConflicts(
    proposals: ChangeProposal<ChangeProposalType>[],
  ): Array<
    ChangeProposal<ChangeProposalType> & { conflictsWith: ChangeProposalId[] }
  > {
    const conflictsById = new SetMultimap<ChangeProposalId, ChangeProposalId>();

    for (let i = 0; i < proposals.length - 1; i++) {
      const proposal = proposals[i];
      const conflictIds = this.findConflictsFor(
        proposal,
        proposals.slice(i + 1),
      );

      for (const conflictId of conflictIds) {
        conflictsById.put(proposal.id, conflictId);
        conflictsById.put(conflictId, proposal.id);
      }
    }

    return proposals.map((proposal) => ({
      ...proposal,
      conflictsWith: Array.from(conflictsById.get(proposal.id)),
    }));
  }

  private findConflictsFor(
    proposal: ChangeProposal<ChangeProposalType>,
    otherProposals: ChangeProposal<ChangeProposalType>[],
  ): ChangeProposalId[] {
    const conflictDetector = getConflictDetector(proposal);
    return otherProposals.reduce((acc, otherProposal) => {
      if (
        conflictDetector(proposal, otherProposal, this.diffService) ||
        conflictDetector(otherProposal, proposal, this.diffService)
      ) {
        acc.push(otherProposal.id);
      }
      return acc;
    }, [] as ChangeProposalId[]);
  }
}
