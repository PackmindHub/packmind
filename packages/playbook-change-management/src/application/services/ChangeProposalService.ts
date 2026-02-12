import { PackmindLogger } from '@packmind/logger';
import {
  ApplyCommandChangeProposalCommand,
  ApplyCommandChangeProposalResponse,
  ChangeProposal,
  ChangeProposalStatus,
  ChangeProposalType,
  CreateChangeProposalCommand,
  createChangeProposalId,
  CreateChangeProposalResponse,
  CreateCommandChangeProposalCommand,
  CreateCommandChangeProposalResponse,
  createUserId,
  ListCommandChangeProposalsResponse,
  RejectCommandChangeProposalCommand,
  RejectCommandChangeProposalResponse,
  ScalarUpdatePayload,
  SpaceId,
  UserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { ChangeProposalConflictError } from '../../domain/errors/ChangeProposalConflictError';
import { ChangeProposalNotFoundError } from '../../domain/errors/ChangeProposalNotFoundError';
import { ChangeProposalNotPendingError } from '../../domain/errors/ChangeProposalNotPendingError';
import { IChangeProposalRepository } from '../../domain/repositories/IChangeProposalRepository';
import { DiffService } from './DiffService';

const origin = 'ChangeProposalService';

export type ApplyProposalResult = ApplyCommandChangeProposalResponse & {
  updatedFields: { name: string; content: string };
};

export class ChangeProposalService {
  constructor(
    private readonly repository: IChangeProposalRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
    private readonly diffService: DiffService = new DiffService(),
  ) {}

  async createProposal(
    command: CreateCommandChangeProposalCommand,
  ): Promise<CreateCommandChangeProposalResponse> {
    const createdBy = createUserId(command.userId);

    const existing = await this.repository.findExistingPending({
      createdBy,
      artefactId: command.artefactId,
      type: command.type,
      payload: command.payload,
    });

    if (existing) {
      this.logger.info(
        'Duplicate pending change proposal found, skipping creation',
        {
          proposalId: existing.id,
          type: existing.type,
          artefactId: existing.artefactId,
        },
      );

      return { changeProposal: existing, wasCreated: false };
    }

    const proposal: ChangeProposal<ChangeProposalType> = {
      id: createChangeProposalId(uuidv4()),
      type: command.type,
      artefactId: command.artefactId,
      artefactVersion: command.artefactVersion,
      spaceId: command.spaceId,
      payload: command.payload,
      captureMode: command.captureMode,
      status: ChangeProposalStatus.pending,
      createdBy,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.repository.save(proposal);

    this.logger.info('Change proposal created', {
      proposalId: proposal.id,
      type: proposal.type,
      artefactId: proposal.artefactId,
    });

    return { changeProposal: proposal, wasCreated: true };
  }

  async createChangeProposal<T extends ChangeProposalType>(
    command: CreateChangeProposalCommand<T>,
    artefactVersion: number,
  ): Promise<CreateChangeProposalResponse<T>> {
    const createdBy = createUserId(command.userId);

    const existing = await this.repository.findExistingPending({
      createdBy,
      artefactId: command.artefactId as string,
      type: command.type,
      payload: command.payload,
    });

    if (existing) {
      this.logger.info(
        'Duplicate pending change proposal found, skipping creation',
        {
          proposalId: existing.id,
          type: existing.type,
          artefactId: existing.artefactId,
        },
      );

      return {
        changeProposal: existing as ChangeProposal<T>,
        wasCreated: false,
      };
    }

    const proposal: ChangeProposal<T> = {
      id: createChangeProposalId(uuidv4()),
      type: command.type as T,
      artefactId: command.artefactId,
      artefactVersion,
      spaceId: command.spaceId,
      payload: command.payload,
      captureMode: command.captureMode,
      status: ChangeProposalStatus.pending,
      createdBy,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.repository.save(proposal);

    this.logger.info('Change proposal created', {
      proposalId: proposal.id,
      type: proposal.type,
      artefactId: proposal.artefactId,
    });

    return { changeProposal: proposal, wasCreated: true };
  }

  async listProposalsByArtefactId(
    spaceId: SpaceId,
    artefactId: string,
    currentRecipe?: { name: string; content: string },
  ): Promise<ListCommandChangeProposalsResponse> {
    const changeProposals = await this.repository.findByArtefactId(
      spaceId,
      artefactId,
    );

    return {
      changeProposals: changeProposals.map((proposal) => ({
        ...proposal,
        outdated: this.isOutdated(proposal, currentRecipe),
      })),
    };
  }

  private isOutdated(
    proposal: ChangeProposal,
    currentRecipe?: { name: string; content: string },
  ): boolean {
    if (proposal.status !== ChangeProposalStatus.pending || !currentRecipe) {
      return false;
    }

    const payload = proposal.payload as ScalarUpdatePayload;

    if (proposal.type === ChangeProposalType.updateCommandName) {
      return payload.oldValue !== currentRecipe.name;
    }

    if (proposal.type === ChangeProposalType.updateCommandDescription) {
      return this.diffService.hasConflict(
        payload.oldValue,
        payload.newValue,
        currentRecipe.content,
      );
    }

    return false;
  }

  async rejectProposal(
    command: RejectCommandChangeProposalCommand,
  ): Promise<RejectCommandChangeProposalResponse> {
    const userId = command.userId as UserId;
    const proposal = await this.repository.findById(command.changeProposalId);

    if (!proposal) {
      throw new ChangeProposalNotFoundError(command.changeProposalId);
    }

    if (proposal.status !== ChangeProposalStatus.pending) {
      throw new ChangeProposalNotPendingError(
        command.changeProposalId,
        proposal.status,
      );
    }

    const rejectedProposal: ChangeProposal<ChangeProposalType> = {
      ...proposal,
      status: ChangeProposalStatus.rejected,
      resolvedBy: userId,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    };

    await this.repository.update(rejectedProposal);

    this.logger.info('Change proposal rejected', {
      artefactId: command.recipeId,
      proposalId: command.changeProposalId,
    });

    return { changeProposal: rejectedProposal };
  }

  async applyProposal(
    command: ApplyCommandChangeProposalCommand,
    currentRecipe: { name: string; content: string },
  ): Promise<ApplyProposalResult> {
    const userId = command.userId as UserId;
    const proposal = await this.repository.findById(command.changeProposalId);

    if (!proposal) {
      throw new ChangeProposalNotFoundError(command.changeProposalId);
    }

    if (proposal.status !== ChangeProposalStatus.pending) {
      throw new ChangeProposalNotPendingError(
        command.changeProposalId,
        proposal.status,
      );
    }

    const payload = proposal.payload as ScalarUpdatePayload;
    const updatedFields = { ...currentRecipe };

    if (proposal.type === ChangeProposalType.updateCommandName) {
      updatedFields.name = payload.newValue;
    } else if (proposal.type === ChangeProposalType.updateCommandDescription) {
      const diffResult = this.diffService.applyLineDiff(
        payload.oldValue,
        payload.newValue,
        currentRecipe.content,
      );

      if (!diffResult.success) {
        if (!command.force) {
          throw new ChangeProposalConflictError(command.changeProposalId);
        }
        updatedFields.content = payload.newValue;
      } else {
        updatedFields.content = diffResult.value;
      }
    }

    const appliedProposal: ChangeProposal<ChangeProposalType> = {
      ...proposal,
      status: ChangeProposalStatus.applied,
      resolvedBy: userId,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    };

    await this.repository.update(appliedProposal);

    this.logger.info('Change proposal applied', {
      artefactId: command.recipeId,
      proposalId: command.changeProposalId,
      forced: command.force,
    });

    return { changeProposal: appliedProposal, updatedFields };
  }
}
