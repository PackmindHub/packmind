# Domain Layer

**Location**: `packages/{domain}/src/domain/`
**Depends on**: Nothing — only pure TypeScript and types from `@packmind/types`

The domain layer contains pure business logic with **zero framework dependencies**. It defines _what_ the domain does, not _how_ it's done.

## Contents

```
domain/
├── entities/              # Domain entities, value objects
├── repositories/          # Repository port interfaces (not implementations)
├── jobs/                  # Delayed job type definitions
├── errors/                # Domain-specific error classes
├── utils/                 # Domain-specific utility functions
└── types/                 # Domain-specific type definitions
```

## Entities

Domain entities are plain TypeScript types or classes defined in `@packmind/types`. They have no decorators, no ORM annotations, and no framework coupling.

```typescript
// packages/types/src/standards/Standard.ts
export type Standard = {
  id: StandardId;
  name: string;
  slug: string;
  description: string;
  version: number;
  userId: UserId;
  spaceId: SpaceId;
};
```

Branded ID types enforce type safety:

```typescript
export type StandardId = string & { __brand: 'StandardId' };
export const createStandardId = (id: string): StandardId => id as StandardId;
```

## Repository Interfaces (Ports)

Repository interfaces define the **contract** for data access. They live in the domain layer so that use cases depend on abstractions, not on infrastructure.

```typescript
// domain/repositories/IStandardRepository.ts
export interface IStandardRepository extends IRepository<Standard> {
  findBySlug(slug: string, organizationId: OrganizationId): Promise<Standard | null>;
  findBySpaceId(spaceId: SpaceId, opts?: QueryOption): Promise<Standard[]>;
}
```

A **repository aggregator** groups related repositories:

```typescript
// domain/repositories/IStandardsRepositories.ts
export interface IStandardsRepositories {
  getStandardRepository(): IStandardRepository;
  getStandardVersionRepository(): IStandardVersionRepository;
  getRuleRepository(): IRuleRepository;
}
```

See [repository.md](../components/repository.md) for the full pattern including implementations.

## Domain Jobs

Job definitions describe background work the domain needs done, without specifying how it's queued:

```typescript
// domain/jobs/GenerateStandardSummary.ts
export type GenerateStandardSummaryInput = {
  standardId: StandardId;
  organizationId: OrganizationId;
};
```

## Rules

1. **No imports from `application/` or `infra/`** — dependency flows inward only
2. **No framework imports** — no TypeORM, no NestJS, no BullMQ
3. **Interfaces only for ports** — implementations live in other layers
4. **Types from `@packmind/types`** — shared entity types are defined centrally
