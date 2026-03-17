---
name: 'hexagonal-architecture'
description: 'Describes the hexagonal architecture (ports and adapters) used across the Packmind monorepo. This skill should be used when creating new domain packages, use cases, services, repositories, or any architectural component to follow established patterns.'
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

## Key Base Classes (from `@packmind/node-utils`)

| Class | Purpose |
|-------|---------|
| `BaseHexa<TOpts, TPort>` | Hexagon lifecycle (construct -> initialize -> destroy) |
| `HexaRegistry` | Central dependency injection container |
| `AbstractMemberUseCase<C, R>` | Use case with member authorization |
| `AbstractAdminUseCase<C, R>` | Use case with admin authorization |
| `AbstractRepository<T>` | Base TypeORM repository with soft delete support |
| `PackmindListener<TAdapter>` | Event subscription base class |
| `PackmindEventEmitterService` | Event bus for domain events |