import { PackmindLogger } from '@packmind/logger';
import {
  ChangeProposal,
  ChangeProposalStatus,
  RecipeId,
  UserId,
  createChangeProposalId,
  CreateCommandChangeProposalCommand,
  CreateCommandChangeProposalResponse,
  ListCommandChangeProposalsResponse,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import {
  CommandChangeProposalType,
  IChangeProposalRepository,
} from '../../domain/repositories/IChangeProposalRepository';

const origin = 'ChangeProposalService';

export class ChangeProposalService {
  constructor(
    private readonly repository: IChangeProposalRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async createProposal(
    command: CreateCommandChangeProposalCommand,
  ): Promise<CreateCommandChangeProposalResponse> {
    const proposal: ChangeProposal<CommandChangeProposalType> = {
      id: createChangeProposalId(uuidv4()),
      type: command.type as CommandChangeProposalType,
      artefactId: command.artefactId,
      artefactVersion: command.artefactVersion,
      payload: command.payload,
      captureMode: command.captureMode,
      status: ChangeProposalStatus.pending,
      createdBy: command.userId as UserId,
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
