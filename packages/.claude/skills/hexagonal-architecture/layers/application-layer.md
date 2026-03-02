# Application Layer

**Location**: `packages/{domain}/src/application/`
**Depends on**: Domain layer + `@packmind/types` + `@packmind/node-utils` (base classes)

The application layer orchestrates domain logic. It implements use cases, coordinates services, wires adapters, and reacts to domain events.

## Contents

```
application/
├── useCases/              # One folder per use case
│   └── {name}/
│       ├── {name}.usecase.ts
│       └── {name}.usecase.spec.ts
├── services/              # Domain services + aggregator
│   ├── {Domain}Services.ts        # Service aggregator
│   └── {Entity}Service.ts         # Individual service
├── adapter/               # Outbound adapter implementing the domain port
│   └── {Domain}Adapter.ts
├── listeners/             # Domain event listeners
│   └── {Domain}Listener.ts
└── jobs/                  # Job factory implementations
```

## Use Cases

The primary unit of work. Each use case lives in its own folder and handles one business operation.

Three authorization levels:
- `AbstractMemberUseCase` — requires authenticated org member
- `AbstractAdminUseCase` — requires org admin
- `IPublicUseCase` — no auth required

See [usecase.md](../components/usecase.md) for templates and examples.

## Services

Services contain reusable business logic called by use cases. A **service aggregator** groups them for the domain.

See [service.md](../components/service.md) for the pattern.

## Adapter

Each domain has a single adapter that implements its port interface (`IXxxPort`). The adapter:
- Exposes all domain operations to other domains
- Instantiates and calls use cases
- Is wired by the Hexa facade during `initialize()`

See [adapter.md](../components/adapter.md) for the pattern.

## Listeners

React to domain events from other domains without creating coupling.

See [listener.md](../components/listener.md) for the pattern.

## Rules

1. **Use cases call services** — not the other way around
2. **Adapter calls use cases** — it's the entry point for external consumers
3. **No direct infra imports** — interact with persistence only via repository interfaces
4. **One use case per folder** — keeps things isolated and testable
5. **Cross-domain access via ports** — never import another domain's internals
