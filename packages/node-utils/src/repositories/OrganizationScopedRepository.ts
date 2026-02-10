import { EntitySchema, Repository, SelectQueryBuilder } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { WithSoftDelete } from '@packmind/types';
import { AbstractRepository } from './AbstractRepository';

export abstract class OrganizationScopedRepository<
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

  protected abstract applyOrganizationScope(
    qb: SelectQueryBuilder<Entity>,
    organizationId: string,
  ): SelectQueryBuilder<Entity>;

  protected createScopedQueryBuilder(
    organizationId: string,
  ): SelectQueryBuilder<Entity> {
    const alias = this.getEntityAlias();
    const qb = this.repository.createQueryBuilder(alias);
    return this.applyOrganizationScope(qb, organizationId);
  }
}
