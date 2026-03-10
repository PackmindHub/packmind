import { IUseCase, PackmindCommand } from '../../UseCase';
import { ChangeProposalType } from '../ChangeProposalType';
import { SpaceId } from '../../spaces';
import { CreateChangeProposalCommand } from './ICreateChangeProposalUseCase';
import { TargetId } from '../../deployments';

export type BatchCreateChangeProposalItem = Omit<
  CreateChangeProposalCommand<ChangeProposalType>,
  keyof PackmindCommand | 'spaceId'
> & {
  targetId: TargetId;
};

export type BatchCreateChangeProposalsCommand = PackmindCommand & {
  spaceId: SpaceId;
  proposals: BatchCreateChangeProposalItem[];
};

export type BatchCreateChangeProposalsResponse = {
  created: number;
  skipped: number;
  errors: Array<{ index: number; message: string; code?: string }>;
};

export type IBatchCreateChangeProposalsUseCase = IUseCase<
  BatchCreateChangeProposalsCommand,
  BatchCreateChangeProposalsResponse
>;
