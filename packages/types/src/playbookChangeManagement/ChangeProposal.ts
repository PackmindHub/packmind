import { UserId } from '../accounts/User';
import { ChangeProposalId } from './ChangeProposalId';
import { ChangeProposalPayload } from './ChangeProposalPayload';
import { ChangeProposalStatus } from './ChangeProposalStatus';
import { ChangeProposalType } from './ChangeProposalType';
import { ChangeProposalCaptureMode } from './ChangeProposalCaptureMode';
import { ChangeProposalArtefactId } from './ChangeProposalArtefactIdType';
import { SpaceId } from '../spaces';
import { ChangeProposalDecision } from './ChangeProposalDecision';
import { GitRepoId } from '../git';
import { TargetId } from '../deployments';

export type ChangeProposal<T extends ChangeProposalType = ChangeProposalType> =
  {
    id: ChangeProposalId;
    type: T;
    artefactId: ChangeProposalArtefactId<T>;
    artefactVersion: number;
    spaceId: SpaceId;
    gitRepoId?: GitRepoId;
    targetId?: TargetId;
    payload: ChangeProposalPayload<T>;
    captureMode: ChangeProposalCaptureMode;
    message: string;
    createdBy: UserId;
    resolvedBy: UserId | null;
    resolvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } & ChangeProposalWithDecision<T>;

type ChangeProposalWithDecision<T extends ChangeProposalType> =
  | {
      status: ChangeProposalStatus.pending;
      decision: null;
    }
  | {
      status: ChangeProposalStatus.rejected;
      decision: null;
    }
  | {
      status: ChangeProposalStatus.applied;
      decision: ChangeProposalDecision<T>;
    };
