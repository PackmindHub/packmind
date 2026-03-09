import { RecipeId } from '../../recipes/RecipeId';
import { SpaceId } from '../../spaces/SpaceId';
import { PackmindCommand } from '../../UseCase';
import { ChangeProposalId } from '../ChangeProposalId';
import { StandardId } from '../../standards';
import { SkillId } from '../../skills';
import { AcceptedChangeProposal } from '../AcceptedChangeProposal';

export type ApplyCreationChangeProposalsCommand = PackmindCommand & {
  spaceId: SpaceId;
  accepted: AcceptedChangeProposal[];
  rejected: ChangeProposalId[];
};

export type ApplyCreationChangeProposalsResponse = {
  created: {
    commands: RecipeId[];
    standards: StandardId[];
    skills: SkillId[];
  };
  rejected: ChangeProposalId[];
};

export interface IApplyCreationChangeProposalsUseCase {
  execute: (
    command: ApplyCreationChangeProposalsCommand,
  ) => Promise<ApplyCreationChangeProposalsResponse>;
}
