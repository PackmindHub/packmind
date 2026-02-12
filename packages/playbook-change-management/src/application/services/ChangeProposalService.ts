import { PackmindLogger } from '@packmind/logger';
import {
  ApplyCommandChangeProposalResponse,
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalStatus,
  ChangeProposalType,
  CreateChangeProposalCommand,
  createChangeProposalId,
  CreateChangeProposalResponse,
  CreateCommandChangeProposalCommand,
  CreateCommandChangeProposalResponse,
  createUserId,
  ListCommandChangeProposalsResponse,
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
    const proposal: ChangeProposal<ChangeProposalType> = {
      id: createChangeProposalId(uuidv4()),
      type: command.type,
      artefactId: command.artefactId,
      artefactVersion: command.artefactVersion,
      spaceId: command.spaceId,
      payload: command.payload,
      captureMode: command.captureMode,
      status: ChangeProposalStatus.pending,
      createdBy: createUserId(command.userId),
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

    return { changeProposal: proposal };
  }

  async createChangeProposal<T extends ChangeProposalType>(
    command: CreateChangeProposalCommand<T>,
    artefactVersion: number,
  ): Promise<CreateChangeProposalResponse<T>> {
    const proposal: ChangeProposal<T> = {
      id: createChangeProposalId(uuidv4()),
      type: command.type as T,
      artefactId: command.artefactId,
      artefactVersion,
      spaceId: command.spaceId,
      payload: command.payload,
      captureMode: command.captureMode,
      status: ChangeProposalStatus.pending,
      createdBy: createUserId(command.userId),
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

    return { changeProposal: proposal };
  }

  async listProposalsByArtefactId(
    artefactId: string,
    currentRecipe?: { name: string; content: string },
  ): Promise<ListCommandChangeProposalsResponse> {
    const changeProposals = await this.repository.findByArtefactId(artefactId);

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

  async listProposalsBySpaceId(
    spaceId: SpaceId,
  ): Promise<ListCommandChangeProposalsResponse> {
    const changeProposals = await this.repository.findBySpaceId(spaceId);
    return {
      changeProposals: changeProposals.map((proposal) => ({
        ...proposal,
        outdated: false,
      })),
    };
  }

  async rejectProposal(
    artefactId: string,
    changeProposalId: ChangeProposalId,
    userId: UserId,
  ): Promise<RejectCommandChangeProposalResponse> {
    const proposals = await this.repository.findByArtefactId(artefactId);
    const proposal = proposals.find((p) => p.id === changeProposalId);

    if (!proposal) {
      throw new ChangeProposalNotFoundError(changeProposalId);
    }

    if (proposal.status !== ChangeProposalStatus.pending) {
      throw new ChangeProposalNotPendingError(
        changeProposalId,
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
      artefactId,
      proposalId: changeProposalId,
    });

    return { changeProposal: rejectedProposal };
  }

  async applyProposal(
    artefactId: string,
    changeProposalId: ChangeProposalId,
    userId: UserId,
    currentRecipe: { name: string; content: string },
    force: boolean,
  ): Promise<ApplyProposalResult> {
    const proposals = await this.repository.findByArtefactId(artefactId);
    const proposal = proposals.find((p) => p.id === changeProposalId);

    if (!proposal) {
      throw new ChangeProposalNotFoundError(changeProposalId);
    }

    if (proposal.status !== ChangeProposalStatus.pending) {
      throw new ChangeProposalNotPendingError(
        changeProposalId,
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
        if (!force) {
          throw new ChangeProposalConflictError(changeProposalId);
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
      artefactId,
      proposalId: changeProposalId,
      forced: force,
    });

    return { changeProposal: appliedProposal, updatedFields };
  }
}
