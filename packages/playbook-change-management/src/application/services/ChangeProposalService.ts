import { PackmindLogger } from '@packmind/logger';
import {
  ChangeProposal,
  ChangeProposalArtefactId,
  ChangeProposalId,
  ChangeProposalPayload,
  ChangeProposalStatus,
  ChangeProposalType,
  CreateChangeProposalCommand,
  createChangeProposalId,
  CreateCommandChangeProposalCommand,
  createUserId,
  ListCommandChangeProposalsResponse,
  ScalarUpdatePayload,
  SpaceId,
  UserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { ChangeProposalConflictError } from '../../domain/errors/ChangeProposalConflictError';
import { IChangeProposalRepository } from '../../domain/repositories/IChangeProposalRepository';
import { DiffService } from './DiffService';

const origin = 'ChangeProposalService';

export type ApplyProposalResult = {
  appliedProposal: ChangeProposal<ChangeProposalType>;
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
  ): Promise<{ changeProposal: ChangeProposal<ChangeProposalType> }> {
    const createdBy = createUserId(command.userId);

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

    return { changeProposal: proposal };
  }

  async createChangeProposal<T extends ChangeProposalType>(
    command: CreateChangeProposalCommand<T>,
    artefactVersion: number,
  ): Promise<{ changeProposal: ChangeProposal<T> }> {
    const createdBy = createUserId(command.userId);

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

    return { changeProposal: proposal };
  }

  async findExistingPending<T extends ChangeProposalType>(
    spaceId: SpaceId,
    createdBy: UserId,
    artefactId: ChangeProposalArtefactId<T>,
    type: T,
    payload: ChangeProposalPayload<T>,
  ): Promise<ChangeProposal<T> | null> {
    const existing = await this.repository.findExistingPending({
      spaceId,
      createdBy,
      artefactId,
      type,
      payload,
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
    }

    return existing;
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

  async findById(
    changeProposalId: ChangeProposalId,
  ): Promise<ChangeProposal<ChangeProposalType> | null> {
    return this.repository.findById(changeProposalId);
  }

  async rejectProposal(
    proposal: ChangeProposal<ChangeProposalType>,
    userId: UserId,
  ): Promise<ChangeProposal<ChangeProposalType>> {
    const rejectedProposal: ChangeProposal<ChangeProposalType> = {
      ...proposal,
      status: ChangeProposalStatus.rejected,
      resolvedBy: userId,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    };

    await this.repository.update(rejectedProposal);

    this.logger.info('Change proposal rejected', {
      proposalId: proposal.id,
      artefactId: proposal.artefactId,
    });

    return rejectedProposal;
  }

  async applyProposal(
    proposal: ChangeProposal<ChangeProposalType>,
    userId: UserId,
    currentRecipe: { name: string; content: string },
    force: boolean,
  ): Promise<ApplyProposalResult> {
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
          throw new ChangeProposalConflictError(proposal.id);
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
      proposalId: proposal.id,
      artefactId: proposal.artefactId,
      forced: force,
    });

    return { appliedProposal, updatedFields };
  }
}
