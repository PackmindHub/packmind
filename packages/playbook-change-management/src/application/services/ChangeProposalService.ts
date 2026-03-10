import { PackmindLogger } from '@packmind/logger';
import {
  AcceptedChangeProposal,
  ChangeProposal,
  ChangeProposalArtefactId,
  ChangeProposalId,
  ChangeProposalPayload,
  ChangeProposalStatus,
  ChangeProposalType,
  CreateChangeProposalCommand,
  createChangeProposalId,
  createUserId,
  CreationChangeProposalTypes,
  PendingChangeProposal,
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
import { isExpectedChangeProposalType } from '../utils/isExpectedChangeProposalType';

const origin = 'ChangeProposalService';

export type ArtefactProposalStats = {
  count: number;
  lastContributedAt: Date;
};

export type GroupedProposalsByArtefact = {
  standards: Map<StandardId, ArtefactProposalStats>;
  commands: Map<RecipeId, ArtefactProposalStats>;
  skills: Map<SkillId, ArtefactProposalStats>;
  creations: PendingChangeProposal<CreationChangeProposalTypes>[];
};

type ArtefactCategory = 'standards' | 'commands' | 'skills';

function getArtefactCategory(type: ChangeProposalType): ArtefactCategory {
  if (
    type === ChangeProposalType.updateCommandName ||
    type === ChangeProposalType.updateCommandDescription ||
    type === ChangeProposalType.createCommand ||
    type === ChangeProposalType.removeCommand
  ) {
    return 'commands';
  }

  if (
    type === ChangeProposalType.updateStandardName ||
    type === ChangeProposalType.updateStandardDescription ||
    type === ChangeProposalType.updateStandardScope ||
    type === ChangeProposalType.addRule ||
    type === ChangeProposalType.updateRule ||
    type === ChangeProposalType.deleteRule ||
    type === ChangeProposalType.createStandard ||
    type === ChangeProposalType.removeStandard
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
      message: command.message ?? '',
      status: ChangeProposalStatus.pending,
      decision: null,
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
      proposal: AcceptedChangeProposal<ChangeProposalType>;
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
          decision: null,
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
      standards: new Map<StandardId, ArtefactProposalStats>(),
      commands: new Map<RecipeId, ArtefactProposalStats>(),
      skills: new Map<SkillId, ArtefactProposalStats>(),
      creations: [],
    };

    for (const proposal of pendingProposals) {
      const artefactCategory = getArtefactCategory(proposal.type);
      switch (artefactCategory) {
        case 'standards': {
          if (
            isExpectedChangeProposalType(
              proposal,
              ChangeProposalType.createStandard,
            )
          ) {
            grouped.creations.push(proposal);
          } else {
            const key = proposal.artefactId as StandardId;
            const existing = grouped.standards.get(key);
            grouped.standards.set(key, {
              count: (existing?.count ?? 0) + 1,
              lastContributedAt:
                existing && existing.lastContributedAt > proposal.createdAt
                  ? existing.lastContributedAt
                  : proposal.createdAt,
            });
          }
          break;
        }
        case 'commands': {
          if (
            isExpectedChangeProposalType(
              proposal,
              ChangeProposalType.createCommand,
            )
          ) {
            grouped.creations.push(proposal);
          } else {
            const key = proposal.artefactId as RecipeId;
            const existing = grouped.commands.get(key);
            grouped.commands.set(key, {
              count: (existing?.count ?? 0) + 1,
              lastContributedAt:
                existing && existing.lastContributedAt > proposal.createdAt
                  ? existing.lastContributedAt
                  : proposal.createdAt,
            });
          }
          break;
        }
        case 'skills': {
          if (
            isExpectedChangeProposalType(
              proposal,
              ChangeProposalType.createSkill,
            )
          ) {
            grouped.creations.push(proposal);
          } else {
            const key = proposal.artefactId as SkillId;
            const existing = grouped.skills.get(key);
            grouped.skills.set(key, {
              count: (existing?.count ?? 0) + 1,
              lastContributedAt:
                existing && existing.lastContributedAt > proposal.createdAt
                  ? existing.lastContributedAt
                  : proposal.createdAt,
            });
          }
          break;
        }
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
