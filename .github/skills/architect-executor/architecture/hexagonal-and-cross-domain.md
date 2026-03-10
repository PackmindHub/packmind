# Hexagonal Architecture & Cross-Domain Integration

## Hexagonal Layer Structure

Each domain package follows a strict three-layer hexagon:

```
Domain Layer (zero external imports — pure business logic)
  ├── entities/           — Domain models
  ├── repositories/       — Port interfaces (I*Repository)
  ├── services/           — Port interfaces (I*Service)
  └── errors/             — Custom domain error classes

Application Layer (depends on domain ports only)
  └── useCases/           — Use case implementations

Infrastructure Layer (adapters — touches databases, APIs, file systems)
  └── infra/
      ├── repositories/   — TypeORM implementations of I*Repository
      ├── services/       — Concrete implementations of I*Service
      └── schemas/        — TypeORM entity schemas
```

**Critical invariant:** Domain layer has zero imports from infrastructure. Use cases depend on port interfaces, never on concrete adapters.

## Cross-Domain Communication

Domains never import each other's internals. Communication goes through typed port interfaces in `packages/types`.

### Rules

- Port interfaces live in `@packmind/types` — expose only needed operations, typed with Command/Response pairs
- Consumer Hexas import only the port interface from `@packmind/types`; access the provider via registry, stored as the port interface type
- All cross-domain Command/Response types live in `packages/types/src/<domain>/contracts/`
- Deferred dependencies use `async initialize()` on HexaFactory with `isRegistered()` checks before `get()`
- Adapters are exposed via public getter methods on the Hexa class, returning the port interface type

### Hexa Facade Pattern

```typescript
class StandardHexa {
  private standardAdapter: IStandardAdapter

  async initialize() {
    if (registry.isRegistered(ISpacePort)) {
      this.spacePort = registry.get(SpaceHexa).getSpaceAdapter() // typed as ISpacePort
    }
  }

  getStandardAdapter(): IStandardAdapter {
    return this.standardAdapter
  }
}
```
