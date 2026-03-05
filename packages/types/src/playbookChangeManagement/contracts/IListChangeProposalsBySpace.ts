import { UserId } from '../../accounts/User';
import { RecipeId } from '../../recipes/RecipeId';
import { SkillFile } from '../../skills/SkillFile';
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
  lastContributedAt: string;
};

export type CommandCreationProposalOverview = {
  proposalId: ChangeProposalId;
  artefactType: 'commands';
  name: string;
  content: string;
  message: string;
  createdBy: UserId;
  lastContributedAt: string;
};

export type StandardCreationProposalOverview = {
  proposalId: ChangeProposalId;
  artefactType: 'standards';
  name: string;
  description: string;
  scope: string | null;
  rules: Array<{ content: string }>;
  message: string;
  createdBy: UserId;
  lastContributedAt: string;
};

export type SkillCreationProposalOverview = {
  proposalId: ChangeProposalId;
  artefactType: 'skills';
  name: string;
  description: string;
  prompt: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowedTools?: string;
  files?: Array<Omit<SkillFile, 'id' | 'skillVersionId'>>;
  message: string;
  createdBy: UserId;
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
