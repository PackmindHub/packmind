# Adapter

**Layer**: Application
**Location**: `packages/{domain}/src/application/adapter/{Domain}Adapter.ts`

The adapter is the **single entry point** for a domain. It implements the domain's port interface (`IXxxPort`) and exposes all operations to other domains and the API layer.

## Structure

```typescript
// application/adapter/StandardsAdapter.ts
import { IBaseAdapter } from '@packmind/node-utils';
import { IStandardsPort, IStandardsPortName } from '@packmind/types';

export class StandardsAdapter
  implements IBaseAdapter<IStandardsPort>, IStandardsPort {

  // Cross-domain ports (set during initialize)
  private accountsPort: IAccountsPort | null = null;
  private gitPort: IGitPort | null = null;
  private spacesPort: ISpacesPort | null = null;

  constructor(
    private readonly standardsServices: StandardsServices,
    private readonly standardsRepositories: IStandardsRepositories,
  ) {}

  // Called by Hexa during registry initialization
  async initialize(deps: Record<string, unknown>): Promise<void> {
    this.accountsPort = deps[IAccountsPortName] as IAccountsPort;
    this.gitPort = deps[IGitPortName] as IGitPort;
    this.spacesPort = deps[ISpacesPortName] as ISpacesPort;

    // Wire ports into services
    this.standardsServices.setLinterAdapter(deps[ILinterPortName] as ILinterPort);
  }

  // --- Port methods: delegate to use cases ---

  async getStandard(command: GetStandardByIdCommand): Promise<GetStandardByIdResponse> {
    const useCase = new GetStandardByIdUsecase(
      this.accountsPort!,
      this.standardsServices.getStandardService(),
    );
    return useCase.execute(command);
  }

  async createStandard(command: CreateStandardCommand): Promise<Standard> {
    const useCase = new CreateStandardUsecase(
      this.accountsPort!,
      this.standardsServices.getStandardService(),
      this.eventEmitterService,
    );
    return useCase.execute(command);
  }

  // --- Background jobs ---

  async addGenerateStandardSummaryJob(input: GenerateStandardSummaryInput): Promise<string> {
    return this.jobsService.submitJob('generateStandardSummary', input);
  }

  // --- Adapter interface ---

  getPort(): IStandardsPort {
    return this;
  }
}
```

## How Other Domains Consume It

```typescript
// In another domain's use case or adapter:
const standard = await this.standardsPort.getStandard({
  standardId,
  userId,
  organizationId,
});
```

The consumer only sees the `IStandardsPort` interface, never the adapter class directly.

## Conventions

- **One adapter per domain** — `{Domain}Adapter`
- **Implements `IBaseAdapter<TPort>` and `TPort`** — both the lifecycle interface and the port
- **Use case instantiation** — use cases are created per-call inside adapter methods
- **Cross-domain ports** — stored as nullable fields, set during `initialize()`
- **No business logic** — the adapter delegates to use cases and services, it doesn't contain logic itself
