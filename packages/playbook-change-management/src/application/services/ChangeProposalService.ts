import { PackmindLogger } from '@packmind/logger';
import {
  ChangeProposal,
  ChangeProposalStatus,
  RecipeId,
  createChangeProposalId,
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
  CreateCommandChangeProposalCommand,
  CreateCommandChangeProposalResponse,
  ListCommandChangeProposalsResponse,
  ChangeProposalType,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { IChangeProposalRepository } from '../../domain/repositories/IChangeProposalRepository';

const origin = 'ChangeProposalService';

export class ChangeProposalService {
  constructor(
    private readonly repository: IChangeProposalRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async createProposal(
    command: CreateCommandChangeProposalCommand,
  ): Promise<CreateCommandChangeProposalResponse> {
    const proposal: ChangeProposal<ChangeProposalType> = {
      id: createChangeProposalId(uuidv4()),
      type: command.type,
      artefactId: command.artefactId,
      artefactVersion: command.artefactVersion,
      payload: command.payload,
      captureMode: command.captureMode,
      status: ChangeProposalStatus.pending,
      createdBy: createUserId(command.userId),
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.repository.save(command.artefactId, proposal);

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
      payload: command.payload,
      captureMode: command.captureMode,
      status: ChangeProposalStatus.pending,
      createdBy: createUserId(command.userId),
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.repository.save(command.artefactId, proposal);

    this.logger.info('Change proposal created', {
      proposalId: proposal.id,
      type: proposal.type,
      artefactId: proposal.artefactId,
    });

    return { changeProposal: proposal };
  }

  async listProposalsByRecipeId(
    recipeId: RecipeId,
  ): Promise<ListCommandChangeProposalsResponse> {
    const changeProposals = await this.repository.findByRecipeId(recipeId);
    return { changeProposals };
  }
}
