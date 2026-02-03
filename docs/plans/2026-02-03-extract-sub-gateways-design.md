# Design: Extract Sub-Gateways from PackmindGateway

## Context

The CLI's `PackmindGateway` contains 22 methods that can be logically grouped. Only one sub-gateway exists (`linter`). This refactoring extracts 5 additional sub-gateways for better organization.

## Decision

Extract 5 sub-gateways following the existing `LinterGateway` pattern:
- `standards` - Standard management operations
- `commands` - Command/recipe operations
- `skills` - Skill operations
- `packages` - Package operations
- `mcp` - MCP integration operations

Keep `getGlobalSpace()`, `notifyDistribution()`, and `pushOnboardingBaseline()` in the main gateway.

## File Structure

```
apps/cli/src/
├── domain/repositories/
│   ├── IPackmindGateway.ts          # Modified - refs sub-gateways
│   ├── ILinterGateway.ts            # Existing
│   ├── IStandardsGateway.ts         # New
│   ├── ICommandsGateway.ts          # New
│   ├── ISkillsGateway.ts            # New
│   ├── IPackagesGateway.ts          # New
│   └── IMcpGateway.ts               # New
│
├── infra/repositories/
│   ├── PackmindGateway.ts           # Modified - instantiates sub-gateways
│   ├── LinterGateway.ts             # Existing
│   ├── StandardsGateway.ts          # New
│   ├── CommandsGateway.ts           # New
│   ├── SkillsGateway.ts             # New
│   ├── PackagesGateway.ts           # New
│   └── McpGateway.ts                # New
│
└── mocks/
    └── createMockGateways.ts        # Modified
```

## Interfaces

### IStandardsGateway

```typescript
export interface IStandardsGateway {
  create(spaceId: string, data: CreateStandardData): Promise<StandardCreated>;
  getRules(spaceId: string, standardId: string): Promise<RuleDto[]>;
  addExampleToRule(spaceId: string, standardId: string, ruleId: string, example: ExampleData): Promise<void>;
  list(): Promise<StandardSummary[]>;
}
```

### ICommandsGateway

```typescript
export interface ICommandsGateway {
  create(spaceId: string, data: CreateCommandData): Promise<CommandCreated>;
  list(): Promise<CommandSummary[]>;
}
```

### ISkillsGateway

```typescript
export interface ISkillsGateway {
  upload(command: UploadSkillCommand): Promise<UploadedSkill>;
  getDefaults(): Promise<DefaultSkill[]>;
  list(): Promise<SkillSummary[]>;
}
```

### IPackagesGateway

```typescript
export interface IPackagesGateway {
  pull(command: PullCommand): Promise<PullData>;
  list(): Promise<PackageSummary[]>;
  getSummary(slug: string): Promise<PackageDetails>;
  create(spaceId: string, data: CreatePackageData): Promise<PackageCreated>;
}
```

### IMcpGateway

```typescript
export interface IMcpGateway {
  getToken(): Promise<string>;
  getUrl(): Promise<string>;
}
```

### IPackmindGateway (modified)

```typescript
export interface IPackmindGateway {
  // Sub-gateways
  readonly standards: IStandardsGateway;
  readonly commands: ICommandsGateway;
  readonly skills: ISkillsGateway;
  readonly packages: IPackagesGateway;
  readonly mcp: IMcpGateway;
  readonly linter: ILinterGateway;

  // Methods remaining in main gateway
  getGlobalSpace(): Promise<string>;
  notifyDistribution(params: NotifyDistributionParams): Promise<void>;
  pushOnboardingBaseline(draft: OnboardingBaseline): Promise<void>;
}
```

## Implementation Pattern

Each sub-gateway follows the `LinterGateway` pattern:

```typescript
export class StandardsGateway implements IStandardsGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}
  // Methods extracted from PackmindGateway
}
```

Instantiation in `PackmindGateway`:

```typescript
export class PackmindGateway implements IPackmindGateway {
  readonly standards: IStandardsGateway;
  // ...

  constructor(private readonly httpClient: PackmindHttpClient) {
    this.standards = new StandardsGateway(httpClient);
    // ...
  }
}
```

## Migration Plan

Order of extraction (simplest to most complex):
1. `McpGateway` (2 methods)
2. `SkillsGateway` (3 methods)
3. `CommandsGateway` (2 methods)
4. `StandardsGateway` (4 methods)
5. `PackagesGateway` (4 methods)

Each sub-gateway = one commit with:
- Interface creation
- Implementation extraction
- Use case updates
- Mock updates
- Tests passing
