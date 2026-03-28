import {
  ApplyChangeProposalsCommand,
  ApplyChangeProposalsResponse,
  ApplyCreationChangeProposalsCommand,
  ApplyCreationChangeProposalsResponse,
  BatchCreateChangeProposalsCommand,
  BatchCreateChangeProposalsResponse,
  ChangeProposalType,
  CheckChangeProposalsCommand,
  CheckChangeProposalsResponse,
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
  IPlaybookChangeManagementPort,
  ListChangeProposalsByArtefactCommand,
  ListChangeProposalsByArtefactResponse,
  ListChangeProposalsBySpaceCommand,
  ListChangeProposalsBySpaceResponse,
  MigrateChangeProposalsForMovedArtefactCommand,
  MigrateChangeProposalsForMovedArtefactResponse,
  RecipeId,
  RecomputeConflictsCommand,
  RecomputeConflictsResponse,
  SkillId,
  StandardId,
} from '@packmind/types';

export class PlaybookChangeManagementAdapter implements IPlaybookChangeManagementPort {
  applyChangeProposals<T extends StandardId | RecipeId | SkillId>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: ApplyChangeProposalsCommand<T>,
  ): Promise<ApplyChangeProposalsResponse<T>> {
    throw new Error('Method not implemented.');
  }

  applyCreationChangeProposals(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: ApplyCreationChangeProposalsCommand,
  ): Promise<ApplyCreationChangeProposalsResponse> {
    throw new Error('Method not implemented.');
  }

  batchCreateChangeProposals(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: BatchCreateChangeProposalsCommand,
  ): Promise<BatchCreateChangeProposalsResponse> {
    throw new Error('Method not implemented.');
  }

  checkChangeProposals(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: CheckChangeProposalsCommand,
  ): Promise<CheckChangeProposalsResponse> {
    throw new Error('Method not implemented.');
  }

  createChangeProposal<T extends ChangeProposalType>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: CreateChangeProposalCommand<T>,
  ): Promise<CreateChangeProposalResponse<T>> {
    throw new Error('Method not implemented.');
  }

  listChangeProposalsByArtefact<T extends StandardId | RecipeId | SkillId>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: ListChangeProposalsByArtefactCommand<T>,
  ): Promise<ListChangeProposalsByArtefactResponse> {
    throw new Error('Method not implemented.');
  }

  listChangeProposalsBySpace(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: ListChangeProposalsBySpaceCommand,
  ): Promise<ListChangeProposalsBySpaceResponse> {
    throw new Error('Method not implemented.');
  }

  recomputeConflicts(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: RecomputeConflictsCommand,
  ): Promise<RecomputeConflictsResponse> {
    throw new Error('Method not implemented.');
  }

  migrateChangeProposalsForMovedArtefact(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: MigrateChangeProposalsForMovedArtefactCommand,
  ): Promise<MigrateChangeProposalsForMovedArtefactResponse> {
    throw new Error('Method not implemented.');
  }
}
