import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces';
import { BatchCreateChangeProposalItem } from './IBatchCreateChangeProposalsUseCase';

export type CheckChangeProposalsCommand = PackmindCommand & {
  spaceId: SpaceId;
  proposals: BatchCreateChangeProposalItem[];
};

export type CheckChangeProposalItemResult = {
  index: number;
  exists: boolean;
  createdAt: string | null;
};

export type CheckChangeProposalsResponse = {
  results: CheckChangeProposalItemResult[];
};

export type ICheckChangeProposalsUseCase = IUseCase<
  CheckChangeProposalsCommand,
  CheckChangeProposalsResponse
>;
