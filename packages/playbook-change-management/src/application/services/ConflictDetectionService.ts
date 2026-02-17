import {
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalType,
} from '@packmind/types';
import { DiffService } from './DiffService';

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
    if (
      proposal.type !== ChangeProposalType.updateCommandName &&
      proposal.type !== ChangeProposalType.updateCommandDescription
    ) {
      return [];
    }

    const conflictingProposals = allProposals.filter((otherProposal) => {
      if (otherProposal.id === proposal.id) {
        return false;
      }

      return this.hasConflict(proposal, otherProposal);
    });

    return conflictingProposals.map((p) => p.id);
  }

  private hasConflict(
    proposal1: ChangeProposal<ChangeProposalType>,
    proposal2: ChangeProposal<ChangeProposalType>,
  ): boolean {
    if (
      proposal1.type === ChangeProposalType.updateCommandName &&
      proposal2.type === ChangeProposalType.updateCommandName
    ) {
      return true;
    }

    if (
      isUpdateCommandDescription(proposal1) &&
      isUpdateCommandDescription(proposal2)
    ) {
      return this.hasDescriptionConflict(proposal1, proposal2);
    }

    return false;
  }

  private hasDescriptionConflict(
    proposal1: ChangeProposal<ChangeProposalType.updateCommandDescription>,
    proposal2: ChangeProposal<ChangeProposalType.updateCommandDescription>,
  ): boolean {
    const { oldValue: oldValue1, newValue: newValue1 } = proposal1.payload;
    const { oldValue: oldValue2, newValue: newValue2 } = proposal2.payload;

    if (oldValue1 !== oldValue2) {
      return false;
    }

    return this.diffService.hasConflict(oldValue1, newValue1, newValue2);
  }
}

function isUpdateCommandDescription(
  tbd: ChangeProposal,
): tbd is ChangeProposal<ChangeProposalType.updateCommandDescription> {
  return tbd.type === ChangeProposalType.updateCommandDescription;
}
