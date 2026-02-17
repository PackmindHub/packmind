import { RecipeId } from '../../recipes/RecipeId';
import { SkillId } from '../../skills/SkillId';
import { SpaceId } from '../../spaces/SpaceId';
import { StandardId } from '../../standards/StandardId';
import { IUseCase, PackmindCommand } from '../../UseCase';

export type ListChangeProposalsBySpaceCommand = PackmindCommand & {
  spaceId: SpaceId;
};

export type ListProposalsOverview<T extends StandardId | RecipeId | SkillId> = {
  artefactId: T;
  name: string;
  changeProposalCount: number;
};

export type ListChangeProposalsBySpaceResponse = {
  standards: ListProposalsOverview<StandardId>[];
  commands: ListProposalsOverview<RecipeId>[];
  skills: ListProposalsOverview<SkillId>[];
};

export type IListChangeProposalsBySpace = IUseCase<
  ListChangeProposalsBySpaceCommand,
  ListChangeProposalsBySpaceResponse
>;
