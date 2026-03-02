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
}

export class ChangeProposalAcceptedEvent extends UserEvent<ChangeProposalAcceptedPayload> {
  static override readonly eventName =
    'change-proposals.change-proposal.accepted';
}
