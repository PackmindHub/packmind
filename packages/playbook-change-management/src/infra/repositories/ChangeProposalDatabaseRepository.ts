import { IChangeProposalRepository } from '../../domain/repositories/IChangeProposalRepository';
import { ChangeProposalSchema } from '../schemas/ChangeProposalSchema';
import {
  DataSource,
  EntitySchema,
  FindOptionsWhere,
  SelectQueryBuilder,
} from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { SpaceScopedRepository } from '@packmind/node-utils';
import {
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalType,
  SpaceId,
  WithSoftDelete,
} from '@packmind/types';

const origin = 'ChangeProposalDatabaseRepository';

export class ChangeProposalDatabaseRepository
  extends SpaceScopedRepository<ChangeProposal<ChangeProposalType>>
  implements IChangeProposalRepository
{
  constructor(
    dataSource: DataSource,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    const repository =
      dataSource.getRepository<ChangeProposal<ChangeProposalType>>(
        ChangeProposalSchema,
      );
    super(
      'changeProposal',
      repository,
      ChangeProposalSchema as unknown as EntitySchema<
        WithSoftDelete<ChangeProposal<ChangeProposalType>>
      >,
      logger,
    );
    this.logger.info('ChangeProposalDatabaseRepository initialized');
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

  protected getEntityAlias(): string {
    return 'change_proposal';
  }

  protected applySpaceScope(
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
