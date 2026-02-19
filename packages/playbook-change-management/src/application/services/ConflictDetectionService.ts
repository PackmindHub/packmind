import {
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalType,
} from '@packmind/types';
import { DiffService } from './DiffService';
import { getConflictDetector } from './conflictDetection/getConflictDetector';

export class ConflictDetectionService {
  constructor(private readonly diffService: DiffService) {}

  detectConflicts(
    proposals: ChangeProposal<ChangeProposalType>[],
  ): Array<
    ChangeProposal<ChangeProposalType> & { conflictsWith: ChangeProposalId[] }
  > {
    return proposals.map((proposal) => ({
      ...proposal,
      conflictsWith: this.findConflictsFor(proposal, proposals),
    }));
  }

  private findConflictsFor(
    proposal: ChangeProposal<ChangeProposalType>,
    allProposals: ChangeProposal<ChangeProposalType>[],
  ): ChangeProposalId[] {
    const conflictDetector = getConflictDetector(proposal);
    const conflictingProposals = allProposals.filter((otherProposal) => {
      return conflictDetector(proposal, otherProposal, this.diffService);
    });

    return conflictingProposals.map((p) => p.id);
  }
}
