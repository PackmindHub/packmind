import { RecipeId } from '../../recipes/RecipeId';
import { SkillId } from '../../skills/SkillId';
import { SpaceId } from '../../spaces/SpaceId';
import { StandardId } from '../../standards/StandardId';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { ChangeProposalId } from '../ChangeProposalId';

export type ListChangeProposalsBySpaceCommand = PackmindCommand & {
  spaceId: SpaceId;
};

export type ListProposalsOverview<T extends StandardId | RecipeId | SkillId> = {
  artefactId: T;
  name: string;
  changeProposalCount: number;
};

export type CommandCreationProposalOverview = {
  proposalId: ChangeProposalId;
  artefactType: 'commands';
  name: string;
  content: string;
};

export type StandardCreationProposalOverview = {
  proposalId: ChangeProposalId;
  artefactType: 'standards';
  name: string;
  description: string;
  scope: string | null;
  rules: Array<{ content: string }>;
};

export type CreationProposalOverview =
  | CommandCreationProposalOverview
  | StandardCreationProposalOverview;

export type ListChangeProposalsBySpaceResponse = {
  standards: ListProposalsOverview<StandardId>[];
  commands: ListProposalsOverview<RecipeId>[];
  skills: ListProposalsOverview<SkillId>[];
  creations: CreationProposalOverview[];
};

export type IListChangeProposalsBySpace = IUseCase<
  ListChangeProposalsBySpaceCommand,
  ListChangeProposalsBySpaceResponse
>;
