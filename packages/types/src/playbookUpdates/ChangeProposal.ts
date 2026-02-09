import { UserId } from '../accounts/User';
import { ChangeProposalId } from './ChangeProposalId';
import { ChangeProposalPayloadMap } from './ChangeProposalPayload';
import { ChangeProposalStatus } from './ChangeProposalStatus';
import { ChangeProposalType } from './ChangeProposalType';

export type ChangeProposal<T extends ChangeProposalType = ChangeProposalType> =
  {
    id: ChangeProposalId;
    type: T;
    artifactId: string;
    artifactVersion: number;
    payload: ChangeProposalPayloadMap[T];
    status: ChangeProposalStatus;
    createdBy: UserId;
    resolvedBy: UserId | null;
    resolvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
