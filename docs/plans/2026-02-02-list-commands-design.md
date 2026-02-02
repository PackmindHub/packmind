# CLI List Commands Design

Add `list` subcommands to display standards, commands, and skills from the Packmind API.

## CLI Interface

```bash
packmind-cli commands list
packmind-cli skills list
packmind-cli standards list
```

## Output Format

Standards and skills (with description):
```
Available standards:

- 🔗 typescript-code-standards
    Name: Typescript code standards
    Description: Adopt TypeScript code standards by prefixing...

- 🔗 tests-redaction
    Name: Tests redaction
    Description: Apply good practices for test redaction...
```

Commands (without description):
```
Available commands:

- 🔗 create-use-case
    Name: Create UseCase with tests

- 🔗 add-api-endpoint
    Name: Add API endpoint
```

## Architecture

Following existing CLI patterns, each list command requires:

### 1. Gateway Layer
- `IPackmindGateway`: Add `listStandards`, `listCommands`, `listSkills` methods
- `PackmindGateway`: Implement API calls (get global space, then list by space)

### 2. Use Case Layer
- `IListStandardsUseCase` + `ListStandardsUseCase`
- `IListCommandsUseCase` + `ListCommandsUseCase`
- `IListSkillsUseCase` + `ListSkillsUseCase`

### 3. Command Layer
- `ListStandardsCommand.ts` with `listStandardsHandler`
- `ListCommandsCommand.ts` with `listCommandsHandler`
- `ListSkillsCommand.ts` with `listSkillsHandler`

### 4. Router Updates
- Add `list` subcommand to `StandardsCommand`, `CommandsCommand`, `SkillsCommand`

## Data Flow

1. Get global space for the organization (authenticated)
2. Call `listStandardsBySpace` / `listRecipesBySpace` / `listSkillsBySpace`
3. Sort results alphabetically by slug
4. Display with formatted output

## Types

```typescript
// Standards
type ListedStandard = {
  slug: string;
  name: string;
  description: string;
};

// Commands (recipes) - no description field
type ListedCommand = {
  slug: string;
  name: string;
};

// Skills
type ListedSkill = {
  slug: string;
  name: string;
  description: string;
};
```

## File Structure

### New Files
```
apps/cli/src/
├── domain/useCases/
│   ├── IListStandardsUseCase.ts
│   ├── IListCommandsUseCase.ts
│   └── IListSkillsUseCase.ts
├── application/useCases/
│   ├── ListStandardsUseCase.ts
│   ├── ListCommandsUseCase.ts
│   └── ListSkillsUseCase.ts
└── infra/commands/
    ├── ListStandardsCommand.ts
    ├── ListCommandsCommand.ts
    └── ListSkillsCommand.ts
```

### Modified Files
```
apps/cli/src/
├── domain/repositories/IPackmindGateway.ts  (add 3 methods)
├── infra/repositories/PackmindGateway.ts    (implement 3 methods)
├── infra/commands/StandardsCommand.ts       (add list subcommand)
├── infra/commands/CommandsCommand.ts        (add list subcommand)
├── infra/commands/SkillsCommand.ts          (add list subcommand)
├── PackmindCliHexa.ts                       (expose 3 use cases)
└── mocks/createMockGateways.ts              (add mock methods)
```

## Implementation Order

1. **Standards list** - Full implementation with tests
2. **Commands list** - Similar pattern, no description
3. **Skills list** - Similar pattern with description
