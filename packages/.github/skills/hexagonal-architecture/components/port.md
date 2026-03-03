# Port

**Layer**: Types package (shared contract)
**Location**: `packages/types/src/{domain}/ports/I{Domain}Port.ts`

A port defines the public interface of a domain — the operations it exposes to other domains and the API layer.

## Structure

```typescript
// packages/types/src/standards/ports/IStandardsPort.ts
export const IStandardsPortName = 'IStandardsPort';

export interface IStandardsPort {
  // Query operations
  getStandard(command: GetStandardByIdCommand): Promise<GetStandardByIdResponse>;
  getStandardsBySpace(command: GetStandardsBySpaceCommand): Promise<Standard[]>;

  // Mutation operations
  createStandard(command: CreateStandardCommand): Promise<Standard>;
  updateStandard(command: UpdateStandardCommand): Promise<Standard>;
  deleteStandard(command: DeleteStandardCommand): Promise<void>;

  // Background jobs
  addGenerateStandardSummaryJob(input: GenerateStandardSummaryInput): Promise<string>;
}
```

## Port Name Constants

Every port has a corresponding string constant used for registry lookup:

```typescript
export const IStandardsPortName = 'IStandardsPort';
export const IGitPortName = 'IGitPort';
export const IAccountsPortName = 'IAccountsPort';
export const IRecipesPortName = 'IRecipesPort';
```

## How Ports Are Consumed

```typescript
// In a Hexa's initialize() method:
const standardsPort = registry.getAdapter<IStandardsPort>(IStandardsPortName);

// In NestJS module provider:
{
  provide: IStandardsPortName,
  useFactory: (registry: HexaRegistry) =>
    registry.getAdapter<IStandardsPort>(IStandardsPortName),
  inject: [HexaRegistry],
}
```

## Existing Ports

| Port | Domain | Purpose |
|------|--------|---------|
| `IAccountsPort` | accounts | Users, orgs, memberships, auth |
| `IStandardsPort` | standards | Coding standards, rules, examples |
| `IRecipesPort` | recipes | Multi-step coding recipes |
| `ISkillsPort` | skills | AI agent skills |
| `IGitPort` | git | Git repos, providers, webhooks |
| `IDeploymentPort` | deployments | Package distribution |
| `ISpacesPort` | spaces | Workspace management |
| `ILlmPort` | llm | LLM integrations |
| `ILinterPort` | linter-execution | Linting rule execution |
| `ICodingAgentPort` | coding-agent | AI agent integration |
| `IPlaybookChangeManagementPort` | playbook-change-management | Change requests |
| `IEventTrackingPort` | (cross-cutting) | Analytics events |

## Conventions

- **Interface + string constant** — always export both `IXxxPort` and `IXxxPortName`
- **Lives in `@packmind/types`** — never in the domain package itself
- **Command/Response types** — methods use typed commands and responses from [contracts](contract.md)
- **No implementation details** — ports are pure interfaces
