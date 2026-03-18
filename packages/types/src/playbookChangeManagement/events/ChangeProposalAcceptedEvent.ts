import { UserEvent } from '../../events';
import { ChangeProposalId } from '../ChangeProposalId';
import {
  ChangeProposalItemType,
  ChangeProposalType,
  isEditableProposalType,
} from '../ChangeProposalType';
import { ScalarUpdatePayload } from '../ChangeProposalPayload';

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

export function isChangeProposalEdited(
  changeType: ChangeProposalType,
  decision: unknown,
  payload: unknown,
): boolean {
  if (!isEditableProposalType(changeType)) {
    return false;
  }
  if (decision === null) {
    return false;
  }
  return (
    (decision as ScalarUpdatePayload).newValue !==
    (payload as ScalarUpdatePayload).newValue
  );
}
