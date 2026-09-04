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
  private standardDelayedJobs: IStandardDelayedJobs | null = null;

  // Use cases — created once in initialize(), reused across calls
  private _createStandard!: CreateStandardUsecase;
  private _getStandardById!: GetStandardByIdUsecase;
  private _deleteStandard!: DeleteStandardUsecase;

  constructor(
    private readonly standardsServices: StandardsServices,
    private readonly standardsRepositories: IStandardsRepositories,
  ) {}

  // Called by Hexa during registry initialization
  async initialize(deps: {
    [IAccountsPortName]: IAccountsPort;
    [ISpacesPortName]: ISpacesPort;
    [ILinterPortName]: ILinterPort;
    jobsService: JobsService;
    eventEmitterService: PackmindEventEmitterService;
  }): Promise<void> {
    this.accountsPort = deps[IAccountsPortName];
    const eventEmitterService = deps.eventEmitterService;

    // Build delayed job objects from job service
    this.standardDelayedJobs = this.buildDelayedJobs(deps.jobsService);

    // Wire ports into services
    this.standardsServices.setLinterAdapter(deps[ILinterPortName]);

    // Create use cases ONCE — stored as private fields for reuse
    this._getStandardById = new GetStandardByIdUsecase(
      this.accountsPort,
      this.standardsServices.getStandardService(),
    );

    this._createStandard = new CreateStandardUsecase(
      this.accountsPort,
      this.standardsServices.getStandardService(),
      this.standardsServices.getStandardVersionService(),
      this.standardDelayedJobs.standardSummaryDelayedJob,
      eventEmitterService,
    );

    this._deleteStandard = new DeleteStandardUsecase(
      this.accountsPort,
      this.standardsServices.getStandardService(),
      eventEmitterService,
    );
  }

  // --- Port methods: delegate to cached use case instances ---

  async getStandard(command: GetStandardByIdCommand): Promise<GetStandardByIdResponse> {
    return this._getStandardById.execute(command);
  }

  async createStandard(command: CreateStandardCommand): Promise<Standard> {
    const result = await this._createStandard.execute(command);
    return result.standard;
  }

  // --- Adapter interface ---

  getPort(): IStandardsPort {
    return this as IStandardsPort;
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
- **Use case instantiation** — use cases are created once in `initialize()` and stored as private fields (prefixed with `_`), reused across method calls
- **Cross-domain ports** — stored as nullable fields, set during `initialize()`
- **No business logic** — the adapter only delegates to use cases and services; all logic lives in use cases/services
- **Delayed jobs** — background jobs use pre-built delayed job objects (via factories), not direct job service calls
