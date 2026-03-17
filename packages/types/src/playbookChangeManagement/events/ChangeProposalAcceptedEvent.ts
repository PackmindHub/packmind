import { UserEvent } from '../../events';
import { ChangeProposalId } from '../ChangeProposalId';
import {
  ChangeProposalItemType,
  ChangeProposalType,
} from '../ChangeProposalType';

export interface ChangeProposalAcceptedPayload {
  changeProposalId: ChangeProposalId;
  itemType: ChangeProposalItemType;
  itemId: string;
  changeType: ChangeProposalType;
  edited: boolean;
}

export class ChangeProposalAcceptedEvent extends UserEvent<ChangeProposalAcceptedPayload> {
  static override readonly eventName =
    'change-proposals.change-proposal.accepted';
}

const EDITABLE_CHANGE_PROPOSAL_TYPES: ReadonlySet<ChangeProposalType> = new Set(
  [
    ChangeProposalType.updateStandardName,
    ChangeProposalType.updateStandardDescription,
    ChangeProposalType.updateCommandName,
    ChangeProposalType.updateCommandDescription,
    ChangeProposalType.updateSkillName,
    ChangeProposalType.updateSkillDescription,
    ChangeProposalType.updateSkillPrompt,
  ],
);

export function isChangeProposalEdited(
  changeType: ChangeProposalType,
  decision: unknown,
): boolean {
  if (!EDITABLE_CHANGE_PROPOSAL_TYPES.has(changeType)) {
    return false;
  }
  return decision !== null;
}
