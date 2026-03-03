import { UserEvent } from '../../events';
import { ChangeProposalCaptureMode } from '../ChangeProposalCaptureMode';
import { ChangeProposalId } from '../ChangeProposalId';
import {
  ChangeProposalItemType,
  ChangeProposalType,
} from '../ChangeProposalType';

export interface ChangeProposalSubmittedPayload {
  changeProposalId: ChangeProposalId;
  itemType: ChangeProposalItemType;
  itemId: string;
  changeType: ChangeProposalType;
  captureMode: ChangeProposalCaptureMode;
}

export class ChangeProposalSubmittedEvent extends UserEvent<ChangeProposalSubmittedPayload> {
  static override readonly eventName =
    'change-proposals.change-proposal.submitted';
}
