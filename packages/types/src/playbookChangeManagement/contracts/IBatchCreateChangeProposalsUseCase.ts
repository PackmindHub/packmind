import { IUseCase, PackmindCommand } from '../../UseCase';
import { ChangeProposalType } from '../ChangeProposalType';
import { SpaceId } from '../../spaces';
import { CreateChangeProposalCommand } from './ICreateChangeProposalUseCase';

export type BatchCreateChangeProposalItem = Omit<
  CreateChangeProposalCommand<ChangeProposalType>,
  keyof PackmindCommand | 'spaceId'
>;

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
