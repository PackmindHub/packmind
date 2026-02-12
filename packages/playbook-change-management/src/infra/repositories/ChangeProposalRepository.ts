import { IChangeProposalRepository } from '../../domain/repositories/IChangeProposalRepository';
import { ChangeProposalSchema } from '../schemas/ChangeProposalSchema';
import { Repository, FindOptionsWhere, SelectQueryBuilder } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, SpaceScopedRepository } from '@packmind/node-utils';
import {
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalType,
  SpaceId,
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

  async findById(
    changeProposalId: ChangeProposalId,
  ): Promise<ChangeProposal<ChangeProposalType> | null> {
    return this.repository.findOne({
      where: {
        id: changeProposalId,
      } as FindOptionsWhere<ChangeProposal<ChangeProposalType>>,
    });
  }

  async findByArtefactId(
    artefactId: string,
  ): Promise<ChangeProposal<ChangeProposalType>[]> {
    return this.repository.find({
      where: {
        artefactId,
      } as FindOptionsWhere<ChangeProposal<ChangeProposalType>>,
    });
  }

  async findBySpaceId(
    spaceId: SpaceId,
  ): Promise<ChangeProposal<ChangeProposalType>[]> {
    return this.repository.find({
      where: {
        spaceId,
      } as FindOptionsWhere<ChangeProposal<ChangeProposalType>>,
    });
  }

  async update(proposal: ChangeProposal<ChangeProposalType>): Promise<void> {
    await this.repository.save(proposal);
  }
}
