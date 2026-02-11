import { EntitySchema, Repository, SelectQueryBuilder } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { WithSoftDelete } from '@packmind/types';
import { AbstractRepository } from './AbstractRepository';

export abstract class SpaceScopedRepository<
  Entity extends { id: string },
> extends AbstractRepository<Entity> {
  constructor(
    entityName: string,
    repository: Repository<Entity>,
    schema: EntitySchema<WithSoftDelete<Entity>>,
    logger?: PackmindLogger,
  ) {
    super(entityName, repository, schema, logger);
  }

  protected abstract getEntityAlias(): string;

  protected abstract applySpaceScope(
    qb: SelectQueryBuilder<Entity>,
    spaceId: string,
  ): SelectQueryBuilder<Entity>;

  protected createScopedQueryBuilder(
    spaceId: string,
  ): SelectQueryBuilder<Entity> {
    const alias = this.getEntityAlias();
    const qb = this.repository.createQueryBuilder(alias);
    return this.applySpaceScope(qb, spaceId);
  }
}
