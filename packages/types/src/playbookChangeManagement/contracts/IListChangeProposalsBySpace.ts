import { RecipeId } from '../../recipes/RecipeId';
import { SkillId } from '../../skills/SkillId';
import { SpaceId } from '../../spaces/SpaceId';
import { StandardId } from '../../standards/StandardId';
import { IUseCase, PackmindCommand } from '../../UseCase';
import { PendingChangeProposal } from '../PendingChangeProposal';
import { ChangeProposalType } from '../ChangeProposalType';

export type ListChangeProposalsBySpaceCommand = PackmindCommand & {
  spaceId: SpaceId;
};

export type ListProposalsOverview<T extends StandardId | RecipeId | SkillId> = {
  artefactId: T;
  name: string;
  changeProposalCount: number;
  lastContributedAt: string;
};

export type CommandCreationProposalOverview =
  PendingChangeProposal<ChangeProposalType.createCommand> & {
    artefactType: 'commands';
    name: string;
    lastContributedAt: string;
  };

export type StandardCreationProposalOverview =
  PendingChangeProposal<ChangeProposalType.createStandard> & {
    artefactType: 'standards';
    name: string;
    lastContributedAt: string;
  };

export type SkillCreationProposalOverview =
  PendingChangeProposal<ChangeProposalType.createSkill> & {
    artefactType: 'skills';
    name: string;
    lastContributedAt: string;
  };

export type CreationProposalOverview =
  | CommandCreationProposalOverview
  | StandardCreationProposalOverview
  | SkillCreationProposalOverview;

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
