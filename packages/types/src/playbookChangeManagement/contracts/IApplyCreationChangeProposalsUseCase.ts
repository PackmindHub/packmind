import { RecipeId } from '../../recipes/RecipeId';
import { SpaceId } from '../../spaces/SpaceId';
import { PackmindCommand } from '../../UseCase';
import { ChangeProposalId } from '../ChangeProposalId';

export type ApplyCreationChangeProposalsCommand = PackmindCommand & {
  spaceId: SpaceId;
  accepted: ChangeProposalId[];
  rejected: ChangeProposalId[];
};

export type ApplyCreationChangeProposalsResponse = {
  created: RecipeId[];
  rejected: ChangeProposalId[];
};

export interface IApplyCreationChangeProposalsUseCase {
  execute: (
    command: ApplyCreationChangeProposalsCommand,
  ) => Promise<ApplyCreationChangeProposalsResponse>;
}
