# Infrastructure Layer

**Location**: `packages/{domain}/src/infra/`
**Depends on**: Domain layer (implements its interfaces) + Application layer + TypeORM

The infrastructure layer provides concrete implementations of domain ports. It handles persistence, database schemas, and job queue mechanics.

## Contents

```
infra/
├── repositories/          # Concrete repository implementations
│   ├── {Entity}Repository.ts
│   └── {Domain}Repositories.ts    # Repository aggregator implementation
├── schemas/               # TypeORM EntitySchema definitions
│   └── {Entity}Schema.ts
└── jobs/                  # BullMQ job implementations
```

## Repositories

Concrete implementations of domain repository interfaces, using TypeORM `QueryBuilder` for database access.

Every repository extends `AbstractRepository<T>` from `@packmind/node-utils` which provides:
- `find()`, `findOne()`, `save()`, `delete()`
- Automatic soft-delete support via `QueryOption.includeDeleted`

See [repository.md](../components/repository.md) for the full pattern.

## Repository Aggregator

Groups all repositories for a domain, implementing the domain's `IXxxRepositories` interface:

```typescript
export class StandardsRepositories implements IStandardsRepositories {
  constructor(private readonly dataSource: DataSource) {}

  getStandardRepository(): IStandardRepository {
    return new StandardRepository();
  }

  getStandardVersionRepository(): IStandardVersionRepository {
    return new StandardVersionRepository();
  }
}
```

## Schemas

TypeORM `EntitySchema` definitions map domain entities to database tables.

See [schema.md](../components/schema.md) for the pattern.

## Rules

1. **Implements domain interfaces** — repositories implement `IXxxRepository`
2. **Framework coupling is OK here** — TypeORM, BullMQ are expected
3. **Parameterized queries only** — use QueryBuilder with `:param` bindings, never string interpolation
4. **Schemas use mixins** — `uuidSchema`, `timestampsSchemas`, `softDeleteSchemas` for consistency
5. **Column naming** — use `snake_case` for DB column names via `name:` property, `camelCase` for entity fields
