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
  createUserId,
  RecipeId,
  SkillId,
  SpaceId,
  StandardId,
  UserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { DataSource } from 'typeorm';
import { IChangeProposalRepository } from '../../domain/repositories/IChangeProposalRepository';
import { ChangeProposalSchema } from '../../infra/schemas/ChangeProposalSchema';

const origin = 'ChangeProposalService';

export type GroupedProposalsByArtefact = {
  standards: Map<StandardId, number>;
  commands: Map<RecipeId, number>;
  skills: Map<SkillId, number>;
};

type ArtefactCategory = 'standards' | 'commands' | 'skills';

function getArtefactCategory(type: ChangeProposalType): ArtefactCategory {
  if (
    type === ChangeProposalType.updateCommandName ||
    type === ChangeProposalType.updateCommandDescription
  ) {
    return 'commands';
  }

  if (
    type === ChangeProposalType.updateStandardName ||
    type === ChangeProposalType.updateStandardDescription ||
    type === ChangeProposalType.addRule ||
    type === ChangeProposalType.updateRule ||
    type === ChangeProposalType.deleteRule
  ) {
    return 'standards';
  }

  return 'skills';
}

export class ChangeProposalService {
  constructor(
    private readonly repository: IChangeProposalRepository,
    private readonly dataSource: DataSource,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

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

  async findById(
    changeProposalId: ChangeProposalId,
  ): Promise<ChangeProposal<ChangeProposalType> | null> {
    return this.repository.findById(changeProposalId);
  }

  /**
   * Batch update proposals (mark as applied or rejected) within a transaction.
   * This ensures atomicity - if any operation fails, all changes are rolled back.
   */
  async batchUpdateProposalsInTransaction(params: {
    acceptedProposals: Array<{
      proposal: ChangeProposal<ChangeProposalType>;
      userId: UserId;
    }>;
    rejectedProposals: Array<{
      proposal: ChangeProposal<ChangeProposalType>;
      userId: UserId;
    }>;
  }): Promise<void> {
    const { acceptedProposals, rejectedProposals } = params;

    await this.dataSource.manager.transaction(async (entityManager) => {
      const now = new Date();

      // Update accepted proposals
      for (const { proposal, userId } of acceptedProposals) {
        const appliedProposal: ChangeProposal<ChangeProposalType> = {
          ...proposal,
          status: ChangeProposalStatus.applied,
          resolvedBy: userId,
          resolvedAt: now,
          updatedAt: now,
        };

        await entityManager.save(ChangeProposalSchema, appliedProposal);

        this.logger.info('Change proposal marked as applied (in transaction)', {
          proposalId: proposal.id,
          artefactId: proposal.artefactId,
        });
      }

      // Update rejected proposals
      for (const { proposal, userId } of rejectedProposals) {
        const rejectedProposal: ChangeProposal<ChangeProposalType> = {
          ...proposal,
          status: ChangeProposalStatus.rejected,
          resolvedBy: userId,
          resolvedAt: now,
          updatedAt: now,
        };

        await entityManager.save(ChangeProposalSchema, rejectedProposal);

        this.logger.info(
          'Change proposal marked as rejected (in transaction)',
          {
            proposalId: proposal.id,
            artefactId: proposal.artefactId,
          },
        );
      }
    });
  }

  async groupProposalsByArtefact(
    spaceId: SpaceId,
  ): Promise<GroupedProposalsByArtefact> {
    const proposals = await this.repository.findBySpaceId(spaceId);
    const pendingProposals = proposals.filter(
      (p) => p.status === ChangeProposalStatus.pending,
    );

    const grouped: GroupedProposalsByArtefact = {
      standards: new Map<StandardId, number>(),
      commands: new Map<RecipeId, number>(),
      skills: new Map<SkillId, number>(),
    };

    for (const proposal of pendingProposals) {
      const artefactCategory = getArtefactCategory(proposal.type);
      switch (artefactCategory) {
        case 'standards':
          grouped.standards.set(
            proposal.artefactId as StandardId,
            (grouped.standards.get(proposal.artefactId as StandardId) ?? 0) + 1,
          );
          break;
        case 'commands':
          grouped.commands.set(
            proposal.artefactId as RecipeId,
            (grouped.commands.get(proposal.artefactId as RecipeId) ?? 0) + 1,
          );
          break;
        case 'skills':
          grouped.skills.set(
            proposal.artefactId as SkillId,
            (grouped.skills.get(proposal.artefactId as SkillId) ?? 0) + 1,
          );
          break;
      }
    }

    this.logger.info('Grouped change proposals by artefact', {
      spaceId,
      standardsCount: grouped.standards.size,
      commandsCount: grouped.commands.size,
      skillsCount: grouped.skills.size,
    });

    return grouped;
  }

  async findProposalsByArtefact(
    spaceId: SpaceId,
    artefactId: StandardId | RecipeId | SkillId,
  ): Promise<ChangeProposal<ChangeProposalType>[]> {
    const proposals = await this.repository.findByArtefactId(
      spaceId,
      artefactId,
    );

    this.logger.info('Found change proposals for artefact', {
      spaceId,
      artefactId,
      count: proposals.length,
    });

    return proposals;
  }
}
