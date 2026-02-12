import { IChangeProposalRepository } from '../../domain/repositories/IChangeProposalRepository';
import { ChangeProposalSchema } from '../schemas/ChangeProposalSchema';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, SpaceScopedRepository } from '@packmind/node-utils';
import {
  ChangeProposal,
  ChangeProposalArtefactId,
  ChangeProposalPayload,
  ChangeProposalStatus,
  ChangeProposalType,
  SpaceId,
  UserId,
} from '@packmind/types';

const origin = 'ChangeProposalRepository';

export class ChangeProposalRepository
  extends SpaceScopedRepository<ChangeProposal<ChangeProposalType>>
  implements IChangeProposalRepository
{
  constructor(
    repository: Repository<
      ChangeProposal<ChangeProposalType>
    > = localDataSource.getRepository<ChangeProposal<ChangeProposalType>>(
      ChangeProposalSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('changeProposal', repository, ChangeProposalSchema, logger);
    this.logger.info('ChangeProposalRepository initialized');
  }

  protected override loggableEntity(
    entity: ChangeProposal<ChangeProposalType>,
  ): Partial<ChangeProposal<ChangeProposalType>> {
    return {
      id: entity.id,
      type: entity.type,
      artefactId: entity.artefactId,
    };
  }

  protected override getEntityAlias(): string {
    return 'change_proposal';
  }

  protected override applySpaceScope(
    qb: SelectQueryBuilder<ChangeProposal<ChangeProposalType>>,
    spaceId: string,
  ): SelectQueryBuilder<ChangeProposal<ChangeProposalType>> {
    return qb.where('change_proposal.space_id = :spaceId', { spaceId });
  }

  async save(proposal: ChangeProposal<ChangeProposalType>): Promise<void> {
    await this.add(proposal);
  }

  async findByArtefactId(
    spaceId: SpaceId,
    artefactId: string,
  ): Promise<ChangeProposal<ChangeProposalType>[]> {
    return this.createScopedQueryBuilder(spaceId)
      .andWhere('change_proposal.artefact_id = :artefactId', { artefactId })
      .getMany();
  }

  async findBySpaceId(
    spaceId: SpaceId,
  ): Promise<ChangeProposal<ChangeProposalType>[]> {
    return this.createScopedQueryBuilder(spaceId).getMany();
  }

  async findExistingPending<T extends ChangeProposalType>(criteria: {
    createdBy: UserId;
    artefactId: ChangeProposalArtefactId<T>;
    type: T;
    payload: ChangeProposalPayload<T>;
  }): Promise<ChangeProposal<T> | null> {
    const result = await this.repository
      .createQueryBuilder('change_proposal')
      .where('change_proposal.created_by = :createdBy', {
        createdBy: criteria.createdBy,
      })
      .andWhere('change_proposal.artefact_id = :artefactId', {
        artefactId: criteria.artefactId,
      })
      .andWhere('change_proposal.type = :type', { type: criteria.type })
      .andWhere('change_proposal.status = :status', {
        status: ChangeProposalStatus.pending,
      })
      .andWhere('change_proposal.payload = :payload::jsonb', {
        payload: JSON.stringify(criteria.payload),
      })
      .getOne();
    return (result as ChangeProposal<T> | null) ?? null;
  }

  async update(proposal: ChangeProposal<ChangeProposalType>): Promise<void> {
    await this.add(proposal);
  }
}
