# Repository

Repositories handle data access. The pattern splits across two layers:
- **Interface (port)** in the Domain layer
- **Implementation** in the Infrastructure layer

## Interface (Domain Layer)

**Location**: `packages/{domain}/src/domain/repositories/I{Entity}Repository.ts`

```typescript
import { IRepository, QueryOption } from '@packmind/node-utils';
import { Standard, StandardId, OrganizationId, SpaceId } from '@packmind/types';

export interface IStandardRepository extends IRepository<Standard> {
  findBySlug(slug: string, organizationId: OrganizationId): Promise<Standard | null>;
  findBySpaceId(spaceId: SpaceId, opts?: QueryOption): Promise<Standard[]>;
  findByOrganizationAndUser(organizationId: OrganizationId, userId: UserId): Promise<Standard[]>;
}
```

`IRepository<T>` provides the base contract: `add`, `findById`, `deleteById`, `restoreById`.

### Repository Aggregator Interface

Groups related repository interfaces:

```typescript
// domain/repositories/IStandardsRepositories.ts
export interface IStandardsRepositories {
  getStandardRepository(): IStandardRepository;
  getStandardVersionRepository(): IStandardVersionRepository;
  getRuleRepository(): IRuleRepository;
  getRuleExampleRepository(): IRuleExampleRepository;
}
```

## Implementation (Infrastructure Layer)

**Location**: `packages/{domain}/src/infra/repositories/{Entity}Repository.ts`

```typescript
import { AbstractRepository } from '@packmind/node-utils';
import { Standard, StandardId, OrganizationId } from '@packmind/types';
import { Repository } from 'typeorm';
import { StandardSchema } from '../schemas/StandardSchema';
import { localDataSource } from '../dataSource';

export class StandardRepository
  extends AbstractRepository<Standard>
  implements IStandardRepository {

  constructor(
    repository: Repository<Standard> = localDataSource.getRepository<Standard>(StandardSchema),
    logger: PackmindLogger = new PackmindLogger('StandardRepository'),
  ) {
    super('standard', repository, StandardSchema, logger);
  }

  async findBySlug(
    slug: string,
    organizationId: OrganizationId,
    opts?: QueryOption,
  ): Promise<Standard | null> {
    const qb = this.repository
      .createQueryBuilder('standard')
      .innerJoin('spaces', 'space', 'standard.space_id = space.id')
      .where('standard.slug = :slug', { slug })
      .andWhere('space.organization_id = :organizationId', { organizationId });

    if (opts?.includeDeleted) {
      qb.withDeleted();
    }

    return qb.getOne() ?? null;
  }
}
```

### Repository Aggregator Implementation

```typescript
// infra/repositories/StandardsRepositories.ts
export class StandardsRepositories implements IStandardsRepositories {
  private readonly standardRepository: IStandardRepository;
  private readonly standardVersionRepository: IStandardVersionRepository;

  constructor(private readonly dataSource: DataSource) {
    // Eager instantiation — all repositories created once in constructor
    this.standardRepository = new StandardRepository(
      this.dataSource.getRepository(StandardSchema),
    );
    this.standardVersionRepository = new StandardVersionRepository(
      this.dataSource.getRepository(StandardVersionSchema),
    );
  }

  getStandardRepository(): IStandardRepository {
    return this.standardRepository;
  }

  getStandardVersionRepository(): IStandardVersionRepository {
    return this.standardVersionRepository;
  }
}
```

## Conventions

- **`AbstractRepository<T>` base class** — provides `add`, `findById`, `deleteById`, `restoreById` with soft-delete support
- **Constructor defaults** — repository and logger have default values for production, overridable for tests
- **Parameterized queries** — always use `:param` bindings in QueryBuilder, never string interpolation
- **Soft deletes** — check `opts?.includeDeleted` and call `qb.withDeleted()` when needed
- **Interface naming** — `I{Entity}Repository` (interface), `{Entity}Repository` (implementation)
