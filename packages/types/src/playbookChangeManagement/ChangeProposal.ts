import { UserId } from '../accounts/User';
import { ChangeProposalId } from './ChangeProposalId';
import { ChangeProposalPayload } from './ChangeProposalPayload';
import { ChangeProposalStatus } from './ChangeProposalStatus';
import { ChangeProposalType } from './ChangeProposalType';
import { ChangeProposalCaptureMode } from './ChangeProposalCaptureMode';
import { ChangeProposalArtefactId } from './ChangeProposalArtefactIdType';
import { SpaceId } from '../spaces';

export type ChangeProposal<T extends ChangeProposalType = ChangeProposalType> =
  {
    id: ChangeProposalId;
    type: T;
    artefactId: ChangeProposalArtefactId<T>;
    artefactVersion: number;
    spaceId: SpaceId;
    payload: ChangeProposalPayload<T>;
    captureMode: ChangeProposalCaptureMode;
    status: ChangeProposalStatus;
    createdBy: UserId;
    resolvedBy: UserId | null;
    resolvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
