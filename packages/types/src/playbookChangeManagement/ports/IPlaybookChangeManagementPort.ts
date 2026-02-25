import {
  ApplyChangeProposalsCommand,
  ApplyChangeProposalsResponse,
} from '../contracts/IApplyChangeProposals';
import {
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
} from '../contracts/ICreateChangeProposalUseCase';
import {
  BatchCreateChangeProposalsCommand,
  BatchCreateChangeProposalsResponse,
} from '../contracts/IBatchCreateChangeProposalsUseCase';
import {
  CheckChangeProposalsCommand,
  CheckChangeProposalsResponse,
} from '../contracts/ICheckChangeProposalsUseCase';
import {
  ListChangeProposalsBySpaceCommand,
  ListChangeProposalsBySpaceResponse,
} from '../contracts/IListChangeProposalsBySpace';
import {
  ListChangeProposalsByArtefactCommand,
  ListChangeProposalsByArtefactResponse,
} from '../contracts/IListChangeProposalsByArtefact';
import { ChangeProposalType } from '../ChangeProposalType';
import { RecipeId } from '../../recipes/RecipeId';
import { SkillId } from '../../skills/SkillId';
import { StandardId } from '../../standards/StandardId';

export const IPlaybookChangeManagementPortName =
  'IPlaybookChangeManagementPort' as const;

export interface IPlaybookChangeManagementPort {
  applyChangeProposals<T extends StandardId | RecipeId | SkillId>(
    command: ApplyChangeProposalsCommand<T>,
  ): Promise<ApplyChangeProposalsResponse<T>>;

  createChangeProposal<T extends ChangeProposalType>(
    command: CreateChangeProposalCommand<T>,
  ): Promise<CreateChangeProposalResponse<T>>;

  batchCreateChangeProposals(
    command: BatchCreateChangeProposalsCommand,
  ): Promise<BatchCreateChangeProposalsResponse>;

  listChangeProposalsBySpace(
    command: ListChangeProposalsBySpaceCommand,
  ): Promise<ListChangeProposalsBySpaceResponse>;

  listChangeProposalsByArtefact<T extends StandardId | RecipeId | SkillId>(
    command: ListChangeProposalsByArtefactCommand<T>,
  ): Promise<ListChangeProposalsByArtefactResponse>;

  checkChangeProposals(
    command: CheckChangeProposalsCommand,
  ): Promise<CheckChangeProposalsResponse>;
}
