# Adapter Port Initialization Standardization Plan

## Overview
Standardize all domain adapters to use a consistent `IBaseAdapter` interface pattern, replacing individual port setter methods with a single `initialize()` method and adding health check capability.

**Key Principles**: 
1. Adapters only declare ports they actually need
2. **All declared ports are REQUIRED** - no optional (`?`) syntax
3. Use cases receive guaranteed non-null ports - no null/undefined handling needed
4. **HexaServices (like JobsService) should be treated like ports** - they can be passed to `initialize()` and checked in `isReady()`

## Per-Domain Transformation Steps

Apply this pattern to each of the 8 domains, one at a time, with a commit after each.

### Step 1: Update Adapter Class

**File:** `packages/{domain}/src/application/adapter/{Domain}Adapter.ts`

#### 1.1 Add IBaseAdapter implementation
```typescript
export class {Domain}Adapter implements IBaseAdapter<I{Domain}Port>, I{Domain}Port {
```

#### 1.2 Declare only needed ports and services - NO null types
```typescript
// Only declare ports this adapter actually uses
// NO (| null) or (| undefined) - ports are set in initialize()
private gitPort!: IGitPort;
private accountsPort!: IAccountsPort;

// HexaServices (like JobsService) are treated like ports
private jobsService!: JobsService;
private delayedJobs!: ISomeDelayedJobs; // Built from JobsService in initialize()

// Don't declare ports you don't need at all
```

#### 1.3 Fix port property names (consistency)
```typescript
// Always use *Port suffix
private accountsPort: IAccountsPort | null = null;
private deploymentsPort: IDeploymentPort | null = null;

// ❌ NOT: accountsAdapter, deploymentsAdapter
```

#### 1.4 Convert use case properties to definite assignment
```typescript
// Use definite assignment - initialized in initialize()
private _someUseCase!: SomeUseCase;
private _anotherUseCase!: AnotherUseCase;

// No initialization in constructor
```

#### 1.5 Add initialize() method - ALL PORTS AND SERVICES REQUIRED
```typescript
/**
 * Initialize adapter with ports and services from registry.
 * All ports and services in signature are REQUIRED.
 */
public initialize(ports: {
  [IGitPortName]: IGitPort;              // Required port
  [IAccountsPortName]: IAccountsPort;    // Required port
  jobsService?: JobsService;             // Optional HexaService (if needed)
  // Only list ports/services this adapter needs
  // No optional (?) syntax for ports - all ports are required
  // HexaServices can be optional if not all adapters need them
}): void {
  // Step 1: Set all ports
  this.gitPort = ports[IGitPortName];
  this.accountsPort = ports[IAccountsPortName];
  
  // Step 2: Handle HexaServices if needed (e.g., JobsService for delayed jobs)
  if (ports.jobsService) {
    this.jobsService = ports.jobsService;
    // Build delayed jobs from JobsService
    this.delayedJobs = this.buildDelayedJobs(this.jobsService);
  }
  
  // Step 3: Validate all required ports/services are set
  if (!this.isReady()) {
    throw new Error('{Domain}Adapter: Required ports/services not provided');
  }
  
  // Step 4: Create all use cases with non-null ports/services
  this._someUseCase = new SomeUseCase(
    this.services.getXxxService(),
    this.gitPort,
    this.accountsPort,
  );
  
  this._anotherUseCase = new AnotherUseCase(
    this.services.getYyyService(),
    this.gitPort,
    this.delayedJobs?.someJob, // Use delayed jobs if available
  );
}

/**
 * Build delayed jobs from JobsService (if adapter needs delayed jobs).
 * This method should be private and called from initialize().
 */
private buildDelayedJobs(jobsService: JobsService): ISomeDelayedJobs {
  const jobFactory = new SomeJobFactory(this.logger, this.repositories);
  jobsService.registerJobQueue(jobFactory.getQueueName(), jobFactory);
  // ... setup and return delayed jobs
  return { someJob: jobFactory.delayedJob };
}
```

#### 1.6 Add isReady() method
```typescript
public isReady(): boolean {
  // Check ALL declared ports and required services are set (not undefined)
  const portsReady = this.gitPort !== undefined 
    && this.accountsPort !== undefined;
  
  // If adapter needs delayed jobs, check them too
  const servicesReady = this.delayedJobs !== undefined; // Only if needed
  
  return portsReady && servicesReady;
  
  // For adapters without service dependencies, just check ports:
  // return this.gitPort !== undefined && this.accountsPort !== undefined;
}
```

#### 1.7 Add getPort() method
```typescript
public getPort(): I{Domain}Port {
  return this as I{Domain}Port;
}
```

#### 1.8 Remove all individual port/service setters
```typescript
// DELETE these methods entirely:
public setGitPort(gitPort: IGitPort): void { ... }
public setAccountsPort(port: IAccountsPort): void { ... }
public updateRecipesPort(port: IRecipesPort): void { ... }
public setDelayedJobs(delayedJobs: IDelayedJobs): void { ... }  // Move to initialize()

// All dependencies (ports AND services) should be set via initialize() only
// Delayed jobs building becomes an internal concern of the adapter
```

#### 1.9 Clean up constructor
```typescript
constructor(
  private readonly services: {Domain}Services,
  private readonly logger: PackmindLogger = new PackmindLogger(origin),
) {
  // Do NOT create use cases here
  // Only initialize services and logger
  this.logger.info('{Domain}Adapter constructed - awaiting initialization');
}
```

### Step 2: Update Use Cases (if needed)

**Files:** `packages/{domain}/src/application/useCases/**/*UseCase.ts`

#### 2.1 Remove null handling from use case constructors
```typescript
// Use cases receive guaranteed non-null ports
constructor(
  private readonly service: SomeService,
  private readonly gitPort: IGitPort,  // Never null!
) {
  // No null handling needed
}

execute(command: Command) {
  // Direct usage - no null checks!
  this.gitPort.addGitRepo(...);
}
```

### Step 3: Update Hexa Class

**File:** `packages/{domain}/src/{Domain}Hexa.ts`

#### 3.1 Make adapter private
```typescript
private readonly adapter: {Domain}Adapter;
```

#### 3.2 Simplify initialize() method
```typescript
async initialize(registry: HexaRegistry): Promise<void> {
  this.logger.info('Initializing {Domain}Hexa (adapter retrieval phase)');
  
  try {
    // Get all required ports - let errors propagate
    const ports: Record<string, unknown> = {
      [IGitPortName]: registry.getAdapter<IGitPort>(IGitPortName),
      [IAccountsPortName]: registry.getAdapter<IAccountsPort>(IAccountsPortName),
      // Only list ports the adapter needs
    };
    
    // If adapter needs HexaServices (like JobsService), add them to ports
    const jobsService = registry.getService(JobsService);
    if (jobsService) {
      ports.jobsService = jobsService;
    }
    
    // Initialize adapter once with all ports and services
    // This will throw if any required port/service is missing
    // Delayed jobs are built internally by the adapter
    this.adapter.initialize(ports);
    
    this.logger.info('{Domain}Hexa initialized successfully');
  } catch (error) {
    this.logger.error('Failed to initialize {Domain}Hexa', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
```

**No try/catch for ports** - if a port is needed, its absence should fail initialization.
**Delayed jobs are now built inside the adapter** - Hexa just passes JobsService.

#### 3.3 Update getAdapter()
```typescript
public getAdapter(): I{Domain}Port {
  return this.adapter.getPort();
}
```

### Step 4: Update Tests

**File:** `packages/{domain}/src/**/*.spec.ts`

#### 4.1 Update adapter initialization
```typescript
const adapter = new {Domain}Adapter(services, logger);
adapter.initialize({
  [IGitPortName]: mockGitPort,
  [IAccountsPortName]: mockAccountsPort,
});
```

#### 4.2 Fix mock types (always non-null)
```typescript
let mockGitPort: IGitPort;

beforeEach(() => {
  mockGitPort = {
    addGitRepo: jest.fn(),
    // ... other methods
  } as unknown as IGitPort;
});
```

#### 4.3 Add tests
```typescript
describe('isReady', () => {
  it('returns false when adapter not initialized', () => {
    const adapter = new {Domain}Adapter(services, logger);
    expect(adapter.isReady()).toBe(false);
  });
  
  it('returns true when all required ports are set', () => {
    const adapter = new {Domain}Adapter(services, logger);
    adapter.initialize({
      [IGitPortName]: mockGitPort,
      [IAccountsPortName]: mockAccountsPort,
    });
    expect(adapter.isReady()).toBe(true);
  });
});

describe('initialize', () => {
  it('throws when required ports not provided', () => {
    const adapter = new {Domain}Adapter(services, logger);
    expect(() => {
      adapter.initialize({
        [IGitPortName]: mockGitPort,
        // Missing IAccountsPortName
      });
    }).toThrow('{Domain}Adapter: Required ports not provided');
  });
});

describe('getPort', () => {
  it('returns the adapter as port interface', () => {
    const adapter = new {Domain}Adapter(services, logger);
    adapter.initialize({
      [IGitPortName]: mockGitPort,
      [IAccountsPortName]: mockAccountsPort,
    });
    expect(adapter.getPort()).toBe(adapter);
  });
});
```

### Step 5: Run Quality Gate
```bash
npm run quality-gate
```

### Step 6: Commit
```bash
git add packages/{domain}/
git commit -m "♻️ Standardize {Domain}Adapter port initialization with IBaseAdapter

- Implement IBaseAdapter<I{Domain}Port>
- Declare only required ports (no optional)
- Move use case creation to initialize() method
- Use definite assignment (!) for use cases
- Validate ports with isReady() before creating use cases
- Remove null handling from use cases
- Simplify {Domain}Hexa.initialize()"
```

## Domain Processing Order

Apply this plan in this order (simplest → most complex):

1. ✅ **spaces** - Simplest
2. ✅ **standards** - Simple
3. ✅ **coding-agent** - Medium
4. ✅ **accounts** - Medium
5. ✅ **git** - Medium
6. ✅ **recipes** - Complex
7. ✅ **deployments** - Complex
8. ✅ **linter** - OSS stub

## Special Cases per Domain

### Standards (delayed jobs)
- Adapter needs JobsService to build delayed jobs
- Pass `jobsService` in `initialize()` ports parameter
- Build delayed jobs internally in adapter via private `buildDelayedJobs()` method
- Remove `setDelayedJobs()` public method

### Recipes (circular dependency)
- Keep `RecipesHexa.setDeploymentPort()` method
- Call `adapter.initialize()` twice with updated ports

### Deployments (constructor dependency)
- Constructor receives `deploymentsHexa` for repositories
- Port dependencies in `initialize()`

### Git (delayed jobs - if applicable)
- Similar to Standards - pass JobsService to adapter
- Build delayed jobs internally in adapter
- Remove any `setGitDelayedJobs()` public method

### Linter (OSS stub)
- `initialize()` no-op
- `isReady()` returns `true`

## Checklist per Domain

After completing each domain:
- [ ] Adapter implements `IBaseAdapter<I{Domain}Port>`
- [ ] Only needed ports declared (all required, no optional `?`)
- [ ] All port properties use `!:` definite assignment (no `| null` or `| undefined`)
- [ ] Port names use `*Port` suffix
- [ ] HexaServices (like JobsService) treated like ports if needed
- [ ] Service properties use `!:` definite assignment (no `| null` or `| undefined`)
- [ ] Use case properties use `!:` definite assignment
- [ ] `initialize()` sets ports/services, checks `isReady()`, creates use cases
- [ ] `isReady()` validates all ports and required services are defined (not undefined)
- [ ] No `set*Port()` or `set*Service()` methods remain (all in `initialize()`)
- [ ] Delayed jobs built internally in adapter (not in Hexa)
- [ ] Use cases receive guaranteed non-null/non-undefined ports/services
- [ ] Hexa calls `adapter.initialize(ports)` once with all dependencies
- [ ] Hexa passes JobsService in ports if adapter needs it
- [ ] Hexa doesn't use try/catch for required ports
- [ ] Tests updated
- [ ] `npm run quality-gate` passes
- [ ] Changes committed

## Post-All-Domains Tasks

After all 8 domains are done:

1. **Add health check to HexaRegistry**
2. **Update `.packmind/standards/ddd-monorepo-architecture.md`**

## Progress Tracking

- [x] Create IBaseAdapter interface (commit: 5da0918)
- [x] Refactor SpacesAdapter (commit: b09af2c)
- [x] Refactor StandardsAdapter (commit: pending)
- [ ] Refactor CodingAgentAdapter
- [ ] Refactor AccountsAdapter
- [ ] Refactor GitAdapter
- [ ] Refactor RecipesAdapter
- [ ] Refactor DeploymentsAdapter
- [ ] Refactor LinterAdapter
- [ ] Add health check to HexaRegistry
- [ ] Update DDD architecture documentation
