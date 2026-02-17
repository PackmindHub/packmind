import { RecipeId } from '../../recipes/RecipeId';
import { SkillId } from '../../skills/SkillId';
import { SpaceId } from '../../spaces/SpaceId';
import { StandardId } from '../../standards/StandardId';
import { PackmindCommand } from '../../UseCase';
import { ChangeProposalId } from '../ChangeProposalId';

export type ApplyChangeProposalsCommand<
  T extends StandardId | RecipeId | SkillId,
> = PackmindCommand & {
  artefactId: T;
  spaceId: SpaceId;
  accepted: ChangeProposalId[];
  rejected: ChangeProposalId[];
};

export type ApplyChangeProposalsResponse = {
  success: ChangeProposalId[];
  failure: {
    id: ChangeProposalId;
    message: string;
  }[];
};

export interface IApplyChangeProposalsUseCase<
  T extends StandardId | RecipeId | SkillId,
> {
  execute: (
    command: ApplyChangeProposalsCommand<T>,
  ) => Promise<ApplyChangeProposalsResponse>;
}
