---
name: 'hexagonal-architecture'
description: 'Describes the hexagonal architecture (ports and adapters) used across the Packmind monorepo. This skill should be used when creating new domain packages, use cases, services, repositories, domain error classes, or any architectural component to follow established patterns, including how a failure raised in a use case becomes an HTTP response.'
---

# Hexagonal Architecture - Packmind Monorepo

## Architecture Map

Every domain package follows a three-layer hexagonal (ports & adapters) architecture. Dependencies flow **inward only**: Infrastructure -> Application -> Domain.

```
packages/{domain}/src/
├── domain/                          # Pure business logic, zero dependencies
│   ├── entities/                    # Domain entities and value objects
│   ├── repositories/                # Repository interfaces (ports)
│   ├── jobs/                        # Delayed job definitions
│   ├── errors/                      # Domain-specific error classes
│   ├── utils/                       # Domain-specific utility functions
│   └── types/                       # Domain-specific type definitions
│
├── application/                     # Orchestration & coordination
│   ├── useCases/{name}/             # One folder per use case
│   │   └── {name}.usecase.ts
│   ├── services/                    # Domain services + service aggregator
│   ├── adapter/                     # Outbound adapter (implements port)
│   ├── listeners/                   # Domain event listeners
│   └── jobs/                        # Delayed job implementations
│
├── infra/                           # Concrete implementations
│   ├── repositories/                # Repository implementations (TypeORM)
│   ├── schemas/                     # TypeORM EntitySchema definitions
│   └── jobs/                        # Job factories
│
└── index.ts                         # Package exports + {Domain}Hexa facade
```

## Layer Details

| Layer | Depends On | Purpose | Details |
|-------|-----------|---------|---------|
| **Domain** | Nothing (pure TS + `@packmind/types`) | Business rules, entity definitions, port interfaces | [domain-layer.md](layers/domain-layer.md) |
| **Application** | Domain | Use case orchestration, services, adapters, events | [application-layer.md](layers/application-layer.md) |
| **Infrastructure** | Domain + Application | Persistence, schemas, job queues | [infrastructure-layer.md](layers/infrastructure-layer.md) |

## Component Reference

Each component type has its own detailed guide with templates and examples:

| Component | Layer | File Pattern | Guide |
|-----------|-------|-------------|-------|
| **Use Case** | Application | `application/useCases/{name}/{name}.usecase.ts` | [usecase.md](components/usecase.md) |
| **Service** | Application | `application/services/{Name}Service.ts` | [service.md](components/service.md) |
| **Adapter** | Application | `application/adapter/{Domain}Adapter.ts` | [adapter.md](components/adapter.md) |
| **Port** | Types package | `packages/types/src/{domain}/ports/I{Domain}Port.ts` | [port.md](components/port.md) |
| **Contract** | Types package | `packages/types/src/{domain}/contracts/{UseCaseName}.ts` | [contract.md](components/contract.md) |
| **Repository (interface)** | Domain | `domain/repositories/I{Entity}Repository.ts` | [repository.md](components/repository.md) |
| **Repository (impl)** | Infrastructure | `infra/repositories/{Entity}Repository.ts` | [repository.md](components/repository.md) |
| **Schema** | Infrastructure | `infra/schemas/{Entity}Schema.ts` | [schema.md](components/schema.md) |
| **Listener** | Application | `application/listeners/{Domain}Listener.ts` | [listener.md](components/listener.md) |
| **Event** | Types package | `packages/types/src/events/{EventName}.ts` | [event.md](components/event.md) |
| **Hexa Facade** | Root | `{Domain}Hexa.ts` + `index.ts` | [hexa-facade.md](components/hexa-facade.md) |

## Dependency Flow

```
  API (NestJS controllers)
         │
         ▼
  ┌─────────────┐
  │ HexaRegistry │  ── Central DI container
  └──────┬──────┘
         │ getAdapter<IXxxPort>(portName)
         ▼
  ┌─────────────┐
  │ {Domain}Hexa │  ── Facade: wires repos, services, adapter
  └──────┬──────┘
         │
    ┌────┴────┐
    ▼         ▼
 Adapter   Services  ── Application layer
    │         │
    ▼         ▼
 Use Cases ──► Domain entities + Repository interfaces
    │
    ▼
 Infra Repositories ── Concrete persistence (TypeORM)
```

## Cross-Domain Communication

Domains talk to each other through two mechanisms:

1. **Synchronous** - Via ports injected through the `HexaRegistry` during `initialize()`.
   Example: `StandardsAdapter` calls `IGitPort.commitToGit()`.

2. **Asynchronous** - Via domain events emitted through `PackmindEventEmitterService`.
   Example: `StandardCreatedEvent` triggers `DeploymentsListener.handleStandardCreated()`.

See [event.md](components/event.md) and [adapter.md](components/adapter.md) for patterns.

## Error Handling

A failure raised in a use case becomes an HTTP response through `DomainExceptionFilter`,
registered globally as an `APP_FILTER`. The filter recognises an error by its `kind`.
`packages/types/src/errors/` declares three interfaces that carry one — `DomainError`,
`InternalError` and `UpstreamError` — whose `kind` values do not overlap. They partition
failures by **fault**: the caller's (`DomainError`), ours (`InternalError`), a third
party's (`UpstreamError`). Fault is the axis, not the HTTP status class — classify by
whose fault it is, then read the status off the table:

| kind | HTTP | Log level | Message returned | Frontend retries |
|------|------|-----------|------------------|------------------|
| `not_found` | 404 | warn | yes | no |
| `forbidden` | 403 | warn | yes | no |
| `invalid_input` | 400 | warn | yes | no |
| `conflict` | 409 | warn | yes | no |
| `internal` (`PackmindInternalError`) | 500 | error + stack | no, generic body | yes, once |
| `upstream_unavailable` (`PackmindUpstreamError`) | 502 | warn | yes | yes, once |
| `upstream_rate_limited` (`PackmindUpstreamError`) | 429 | warn | yes, plus `Retry-After` | no |

Two rows look wrong until you read them by fault, so leave them alone. `upstream_unavailable`
answers **502, not 503**: a 503 claims *we* are unavailable, while it is the thing behind us
that failed. `upstream_rate_limited` answers a **4xx and is still not a `DomainErrorKind`**:
the caller did not misuse the API — our shared credential hit someone else's quota, and
waiting, not a corrected request, is the remedy. When the provider said how long to wait, the
error carries `retryAfterSeconds` and the filter emits it as the `Retry-After` header.

**Never `throw new Error(...)` from a use case or a service.** A bare `Error` carries no
`kind`, so it reaches Nest's `ExceptionsHandler` and answers 500 with a full stack logged at
`error` level — even when the correct answer was a 404.

Controllers **propagate**; they never translate. No `instanceof` plus `throw new
NotFoundException(...)` — the filter is the only place `kind` maps to a status.

They also never **log**. A catch block that does `logger.error(msg, { error:
error.message })` and then `throw error;` records an expected, caller-correctable failure
at `error` level, throws away the stack and the typed `context`, and leaves the filter to
log the same failure a second time at `warn`. Two records of one event, and the louder
carries less. Delete the catch — the filter records it once, with more.

Listeners run outside the HTTP request scope, so the filter never sees their exceptions: a
listener logs a domain error at `warn`, an upstream error at `warn` too, and an internal
error at `error` with its stack.

Full rules, including the non-leaking cross-tenant rule, are in the
`domain-error-handling` standard. See [domain-layer.md](layers/domain-layer.md) for the
class shape.

## Key Base Classes (from `@packmind/node-utils`, error bases from `@packmind/types`)

| Class | Purpose |
|-------|---------|
| `BaseHexa<TOpts, TPort>` | Hexagon lifecycle (construct -> initialize -> destroy) |
| `HexaRegistry` | Central dependency injection container |
| `AbstractMemberUseCase<C, R>` | Use case with org member authorization |
| `AbstractSpaceMemberUseCase<C, R>` | Use case with org + space member authorization |
| `AbstractAdminUseCase<C, R>` | Use case with admin authorization |
| `AbstractRepository<T>` | Base TypeORM repository with soft delete support |
| `PackmindListener<TAdapter>` | Event subscription base class |
| `UserAccessError` | Reference shape for a domain error: `kind` + literal `reason` union + typed `context` + fixed message |
| `PackmindInternalError` (`@packmind/types`) | Base for a broken invariant: `reason` + `context` + message; the message is for the log only, never returned |
| `PackmindUpstreamError` (`@packmind/types`) | Base for a third-party failure: same shape plus a `kind` and an optional `retryAfterSeconds`; unlike `PackmindInternalError`, **its message is returned to the caller** |
| `DomainExceptionFilter` | Global `APP_FILTER`; holds the only `kind` -> HTTP status mapping, for domain and upstream kinds alike (`@packmind/node-utils/filters`) |
| `PackmindEventEmitterService` | Event bus for domain events |