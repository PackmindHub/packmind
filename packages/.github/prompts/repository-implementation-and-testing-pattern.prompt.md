---
description: 'Implement a standardized repository with soft delete functionality and comprehensive tests to ensure maintainable code and reliable data access patterns in the Packmind codebase.'
agent: 'agent'
---

Implement a standardized repository with soft delete functionality and comprehensive tests to ensure maintainable code and reliable data access patterns in the Packmind codebase.

## When to Use

- When creating a new repository for an entity
- When you need to implement data access layer following Packmind patterns
- When writing comprehensive tests for repositories
- When implementing soft delete functionality

## Context Validation Checkpoints

* [ ] Have you defined the entity and its TypeORM schema?
* [ ] Do you know which domain-specific finder methods are needed?
* [ ] Have you created a test factory for the entity?
* [ ] Is the AbstractRepository base class available in @packmind/shared?

## Recipe Steps

### Step 1: Define Repository Interface

Create the repository interface extending IRepository from @packmind/shared. Add domain-specific finder methods that will be needed by use cases.

```typescript
import { Entity } from '../entities/Entity';
import { IRepository, QueryOption } from '@packmind/shared';
import { OrganizationId } from '@packmind/accounts';

export interface IEntityRepository extends IRepository<Entity> {
  findBySlug(slug: string, opts?: QueryOption): Promise<Entity | null>;
  findByOrganizationId(organizationId: OrganizationId): Promise<Entity[]>;
  // Add other domain-specific finder methods
}
```

### Step 2: Implement Repository Class

Create the repository class extending AbstractRepository. Implement the interface with proper logging for all operations. Override loggableEntity to specify which fields should be logged.

```typescript
import { Entity } from '../../domain/entities/Entity';
import { IEntityRepository } from '../../domain/repositories/IEntityRepository';
import { EntitySchema } from '../schemas/EntitySchema';
import { Repository } from 'typeorm';
import {
  PackmindLogger,
  localDataSource,
  AbstractRepository,
  QueryOption,
} from '@packmind/shared';
import { OrganizationId } from '@packmind/accounts';

const origin = 'EntityRepository';

export class EntityRepository
  extends AbstractRepository<Entity>
  implements IEntityRepository
{
  constructor(
    repository: Repository<Entity> = localDataSource.getRepository<Entity>(EntitySchema),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('entity', repository, logger, EntitySchema);
    this.logger.info('EntityRepository initialized');
  }

  protected override loggableEntity(entity: Entity): Partial<Entity> {
    return {
      id: entity.id,
      name: entity.name, // Include key identifying fields only
    };
  }

  async findBySlug(slug: string, opts?: QueryOption): Promise<Entity | null> {
    this.logger.info('Finding entity by slug', { slug });

    try {
      const entity = await this.repository.findOne({
        where: { slug },
        withDeleted: opts?.includeDeleted ?? false,
      });
      
      if (entity) {
        this.logger.info('Entity found by slug', { slug, entityId: entity.id });
      } else {
        this.logger.warn('Entity not found by slug', { slug });
      }
      return entity;
    } catch (error) {
      this.logger.error('Failed to find entity by slug', {
        slug,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
```

### Step 3: Create Test Factory

Create a factory for generating test entities using the Factory pattern from @packmind/shared/test. Provide reasonable defaults for all required fields.

```typescript
import { Factory } from '@packmind/shared/test';
import { Entity, createEntityId } from '../src/domain/entities/Entity';
import { createOrganizationId } from '@packmind/accounts';
import { v4 as uuidv4 } from 'uuid';

export const entityFactory: Factory<Entity> = (entity?: Partial<Entity>) => {
  return {
    id: createEntityId(uuidv4()),
    name: 'Test Entity',
    slug: 'test-entity',
    organizationId: createOrganizationId(uuidv4()),
    // Add other required fields with reasonable defaults
    ...entity,
  };
};
```

### Step 4: Create Repository Tests

Create comprehensive tests following the established pattern. Include tests for basic CRUD operations, domain-specific finder methods, soft delete functionality using itHandlesSoftDelete helper, error scenarios, and multiple entities scenarios.

```typescript
import { EntityRepository } from './EntityRepository';
import { EntitySchema } from '../schemas/EntitySchema';
import { DataSource, Repository } from 'typeorm';
import { itHandlesSoftDelete, makeTestDatasource } from '@packmind/shared/test';
import { entityFactory } from '../../../test/entityFactory';
import { createEntityId, Entity } from '../../domain/entities/Entity';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger, WithSoftDelete } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { createOrganizationId } from '@packmind/accounts';
import { IEntityRepository } from '../../domain/repositories/IEntityRepository';

describe('EntityRepository', () => {
  let datasource: DataSource;
  let entityRepository: IEntityRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let typeormRepo: Repository<Entity>;

  beforeEach(async () => {
    datasource = await makeTestDatasource([EntitySchema]);
    await datasource.initialize();
    await datasource.synchronize();

    stubbedLogger = stubLogger();
    typeormRepo = datasource.getRepository(EntitySchema);

    entityRepository = new EntityRepository(typeormRepo, stubbedLogger);
  });

  afterEach(async () => {
    await datasource.destroy();
  });

  it('can store and retrieve entities by organization', async () => {
    const entity = entityFactory();
    await entityRepository.add(entity);

    expect(
      await entityRepository.findByOrganizationId(entity.organizationId),
    ).toStrictEqual([entity]);
  });

  // Use shared soft delete test helper
  itHandlesSoftDelete<Entity>({
    entityFactory: entityFactory,
    getRepository: () => entityRepository,
    queryDeletedEntity: async (id) =>
      typeormRepo.findOne({
        where: { id },
        withDeleted: true,
      }) as unknown as WithSoftDelete<Entity>,
  });
});
```

### Step 5: Test Domain-Specific Finder Methods

Add comprehensive tests for each domain-specific finder method, including tests for finding deleted entities with the includeDeleted flag.

```typescript
describe('findBySlug', () => {
  let entity: Entity;

  beforeEach(async () => {
    entity = await entityRepository.add(entityFactory());
  });

  it('can find an entity by slug', async () => {
    expect(await entityRepository.findBySlug(entity.slug)).toEqual(entity);
  });

  describe('when entity has been deleted', () => {
    beforeEach(async () => {
      await entityRepository.deleteById(entity.id);
    });

    it('cannot find a deleted entity by slug', async () => {
      expect(await entityRepository.findBySlug(entity.slug)).toBeNull();
    });

    it('can find a deleted entity by slug if includeDeleted flag is true', async () => {
      expect(
        await entityRepository.findBySlug(entity.slug, { includeDeleted: true }),
      ).toMatchObject({ id: entity.id, name: entity.name });
    });
  });
});
```
