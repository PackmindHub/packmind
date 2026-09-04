# Contract (Command / Response)

**Layer**: Types package (shared contract)
**Location**: `packages/types/src/{domain}/contracts/{UseCaseName}.ts`

Contracts define the input (Command) and output (Response) of every use case, along with the use case interface.

## Structure

```typescript
// packages/types/src/standards/contracts/GetStandardById.ts
import { PackmindCommand, IUseCase } from '../..';
import { StandardId, SpaceId } from '../Standard';

export type GetStandardByIdCommand = PackmindCommand & {
  standardId: StandardId;
  spaceId: SpaceId;
};

export type GetStandardByIdResponse = {
  standard: Standard | null;
};

export interface IGetStandardByIdUseCase
  extends IUseCase<GetStandardByIdCommand, GetStandardByIdResponse> {}
```

## Command Base Types

Three command base types depending on authorization level:

```typescript
// Authenticated operations (member or admin)
export type PackmindCommand = {
  userId: string;
  organizationId: string;
  source?: PackmindEventSource;
  originSkill?: string;
};

// Public (no auth required)
export type PublicPackmindCommand = object;

// System-initiated (background jobs, webhooks)
export type SystemPackmindCommand = {
  organizationId: string;
  userId?: string;
};
```

## Use Case Interface

```typescript
// Generic use case contract
export interface IUseCase<TCommand, TResponse> {
  execute(command: TCommand): Promise<TResponse>;
}

// Shorthand for public use cases
export interface IPublicUseCase<TCommand, TResponse>
  extends IUseCase<TCommand, TResponse> {}

// For system-initiated use cases (background jobs, webhooks)
export interface ISystemUseCase<TCommand, TResponse>
  extends IUseCase<TCommand, TResponse> {}
```

## Conventions

- **One file per use case** — `{PascalCaseName}.ts` matching the use case name
- **Three exports per file** — `XxxCommand`, `XxxResponse`, `IXxxUseCase`
- **Command extends base type** — `PackmindCommand`, `PublicPackmindCommand`, or `SystemPackmindCommand`
- **Response is a typed object** — never `any` or raw primitives
- **Barrel export** — all contracts re-exported from `packages/types/src/{domain}/index.ts`
