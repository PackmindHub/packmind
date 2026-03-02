# Hexa Facade

**Layer**: Package root
**Location**: `packages/{domain}/src/{Domain}Hexa.ts` (exported from `index.ts`)

The Hexa facade is the entry point and lifecycle manager for a domain package. It wires together repositories, services, and the adapter, and registers the domain with the central `HexaRegistry`.

## Structure

```typescript
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import { IStandardsPort, IStandardsPortName, IAccountsPortName, ISpacesPortName } from '@packmind/types';
import { DataSource } from 'typeorm';

export class StandardsHexa extends BaseHexa<BaseHexaOpts, StandardsAdapter> {
  private readonly adapter: StandardsAdapter;
  private readonly standardsRepositories: StandardsRepositories;
  private readonly standardsServices: StandardsServices;

  constructor(dataSource: DataSource, opts?: Partial<BaseHexaOpts>) {
    super(dataSource, opts);

    // 1. Infrastructure: create repositories
    this.standardsRepositories = new StandardsRepositories(this.dataSource);

    // 2. Application: create services with repositories
    this.standardsServices = new StandardsServices(this.standardsRepositories);

    // 3. Application: create adapter with services + repositories
    this.adapter = new StandardsAdapter(
      this.standardsServices,
      this.standardsRepositories,
    );
  }

  // Called after ALL hexas are constructed — cross-domain ports now available
  public async initialize(registry: HexaRegistry): Promise<void> {
    const accountsPort = registry.getAdapter<IAccountsPort>(IAccountsPortName);
    const spacesPort = registry.getAdapter<ISpacesPort>(ISpacesPortName);
    const jobsService = registry.getService(JobsService);
    const eventEmitterService = registry.getService(PackmindEventEmitterService);

    // Wire cross-domain ports into services
    this.standardsServices.setLinterAdapter(
      registry.getAdapter<ILinterPort>(ILinterPortName),
    );

    // Initialize adapter with all dependencies
    await this.adapter.initialize({
      [IAccountsPortName]: accountsPort,
      [ISpacesPortName]: spacesPort,
      jobsService,
      eventEmitterService,
    });

    // Register event listeners
    const listener = new StandardsListener(this.adapter);
    eventEmitterService.registerListener(listener);
  }

  public getAdapter(): StandardsAdapter {
    return this.adapter;
  }

  public getPortName(): string {
    return IStandardsPortName;
  }

  public destroy(): void {
    // Cleanup resources, close connections
  }
}
```

## Lifecycle

```
1. Construction     →  new StandardsHexa(dataSource)
                        Creates repos, services, adapter (no cross-domain deps yet)

2. Registration     →  registry.register(StandardsHexa)
                        Tells the registry this hexa exists

3. Initialization   →  hexa.initialize(registry)
                        Cross-domain ports now available; wire everything together

4. Runtime          →  registry.getAdapter<IStandardsPort>(IStandardsPortName)
                        Other domains and the API layer consume the adapter

5. Destruction      →  hexa.destroy()
                        Cleanup when shutting down
```

## Registration in the API

```typescript
// apps/api/src/main.ts
const registry = new HexaRegistry();

registry.register(AccountsHexa);
registry.register(StandardsHexa);
registry.register(RecipesHexa);
registry.register(SkillsHexa);
registry.register(GitHexa);
registry.register(DeploymentsHexa);
// ...

registry.registerService(JobsService);
registry.registerService(PackmindEventEmitterService);

await registry.init(dataSource);
```

## Conventions

- **Class naming** — `{Domain}Hexa` (e.g., `StandardsHexa`, `RecipesHexa`)
- **Extends `BaseHexa<TOpts, TPort>`** — provides lifecycle hooks
- **Port name** — `getPortName()` returns the string constant from `@packmind/types`
- **Constructor** — creates only local dependencies (repos, services, adapter)
- **`initialize()`** — wires cross-domain ports from registry
- **Exported from `index.ts`** — alongside the adapter type for consumers
