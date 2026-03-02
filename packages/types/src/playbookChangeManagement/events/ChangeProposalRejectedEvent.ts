import { UserEvent } from '../../events';
import { ChangeProposalId } from '../ChangeProposalId';
import {
  ChangeProposalItemType,
  ChangeProposalType,
} from '../ChangeProposalType';

export interface ChangeProposalRejectedPayload {
  changeProposalId: ChangeProposalId;
  itemType: ChangeProposalItemType;
  itemId: string;
  changeType: ChangeProposalType;
}

export class ChangeProposalRejectedEvent extends UserEvent<ChangeProposalRejectedPayload> {
  static override readonly eventName =
    'change-proposals.change-proposal.rejected';
}
