import {
  ApplyCommandChangeProposalCommand,
  ApplyCommandChangeProposalResponse,
} from '../contracts/IApplyCommandChangeProposalUseCase';
import {
  ApplyChangeProposalsCommand,
  ApplyChangeProposalsResponse,
} from '../contracts/IApplyChangeProposals';
import {
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
} from '../contracts/ICreateChangeProposalUseCase';
import {
  CreateCommandChangeProposalCommand,
  CreateCommandChangeProposalResponse,
} from '../contracts/ICreateCommandChangeProposalUseCase';
import {
  ListCommandChangeProposalsCommand,
  ListCommandChangeProposalsResponse,
} from '../contracts/IListCommandChangeProposalsUseCase';
import {
  RejectCommandChangeProposalCommand,
  RejectCommandChangeProposalResponse,
} from '../contracts/IRejectCommandChangeProposalUseCase';
import {
  BatchCreateChangeProposalsCommand,
  BatchCreateChangeProposalsResponse,
} from '../contracts/IBatchCreateChangeProposalsUseCase';
import {
  BatchApplyChangeProposalsCommand,
  BatchApplyChangeProposalsResponse,
} from '../contracts/IBatchApplyChangeProposalsUseCase';
import {
  BatchRejectChangeProposalsCommand,
  BatchRejectChangeProposalsResponse,
} from '../contracts/IBatchRejectChangeProposalsUseCase';
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
  applyCommandChangeProposal(
    command: ApplyCommandChangeProposalCommand,
  ): Promise<ApplyCommandChangeProposalResponse>;

  applyChangeProposals<T extends StandardId | RecipeId | SkillId>(
    command: ApplyChangeProposalsCommand<T>,
  ): Promise<ApplyChangeProposalsResponse<T>>;

  createChangeProposal<T extends ChangeProposalType>(
    command: CreateChangeProposalCommand<T>,
  ): Promise<CreateChangeProposalResponse<T>>;

  createCommandChangeProposal(
    command: CreateCommandChangeProposalCommand,
  ): Promise<CreateCommandChangeProposalResponse>;

  listCommandChangeProposals(
    command: ListCommandChangeProposalsCommand,
  ): Promise<ListCommandChangeProposalsResponse>;

  rejectCommandChangeProposal(
    command: RejectCommandChangeProposalCommand,
  ): Promise<RejectCommandChangeProposalResponse>;

  batchCreateChangeProposals(
    command: BatchCreateChangeProposalsCommand,
  ): Promise<BatchCreateChangeProposalsResponse>;

  batchApplyChangeProposals(
    command: BatchApplyChangeProposalsCommand,
  ): Promise<BatchApplyChangeProposalsResponse>;

  batchRejectChangeProposals(
    command: BatchRejectChangeProposalsCommand,
  ): Promise<BatchRejectChangeProposalsResponse>;

  listChangeProposalsBySpace(
    command: ListChangeProposalsBySpaceCommand,
  ): Promise<ListChangeProposalsBySpaceResponse>;

  listChangeProposalsByArtefact<T extends StandardId | RecipeId | SkillId>(
    command: ListChangeProposalsByArtefactCommand<T>,
  ): Promise<ListChangeProposalsByArtefactResponse>;
}
