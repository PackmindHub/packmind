import { RecipeId } from '../../recipes/RecipeId';
import { SkillId } from '../../skills/SkillId';
import { SpaceId } from '../../spaces/SpaceId';
import { StandardId } from '../../standards/StandardId';
import { PackmindCommand } from '../../UseCase';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalId } from '../ChangeProposalId';

export type ListChangeProposalsByArtefactCommand<
  T extends StandardId | RecipeId | SkillId,
> = PackmindCommand & {
  spaceId: SpaceId;
  artefactId: T;
};

export type ListChangeProposalsByArtefactResponse = {
  changeProposals: ChangeProposal &
    {
      conflictsWith: ChangeProposalId[];
    }[];
};

export interface IListChangeProposalsByArtefact<
  T extends StandardId | RecipeId | SkillId,
> {
  execute: (
    command: ListChangeProposalsByArtefactCommand<T>,
  ) => Promise<ListChangeProposalsByArtefactResponse>;
}
