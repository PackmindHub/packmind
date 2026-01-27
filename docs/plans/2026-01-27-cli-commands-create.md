# CLI Commands Create Feature

**Date:** 2026-01-27
**Status:** Ready for implementation

## Overview

Implement a `packmind commands create` CLI command that allows AI agents to create commands from a JSON playbook file, mirroring the existing `packmind standards create` pattern.

## Command Usage

```bash
packmind commands create ./my-command.json
```

## Playbook Structure

```json
{
  "name": "Setup React Component",
  "summary": "Create a new React component with proper structure and tests",
  "whenToUse": [
    "When creating a new UI component",
    "When adding a reusable component to the design system"
  ],
  "contextValidationCheckpoints": [
    "Is the component name following naming conventions?",
    "Does a similar component already exist?"
  ],
  "steps": [
    {
      "name": "Create component file",
      "description": "Create the component file in the appropriate directory",
      "codeSnippet": "```tsx\nexport const Button = () => <button />;\n```"
    },
    {
      "name": "Add tests",
      "description": "Create unit tests for the component"
    }
  ]
}
```

### Validation Rules (Zod)

- `name`: required, non-empty string
- `summary`: required, non-empty string
- `whenToUse`: required, array of non-empty strings (min 1)
- `contextValidationCheckpoints`: required, array of non-empty strings (min 1)
- `steps`: required, array (min 1) of objects with:
  - `name`: required, non-empty string
  - `description`: required, non-empty string
  - `codeSnippet`: optional string

## Architecture

### Files to Create

**Domain layer:**
- `apps/cli/src/domain/entities/CommandPlaybookDTO.ts` - Zod schema for validation
- `apps/cli/src/domain/useCases/ICreateCommandFromPlaybookUseCase.ts` - interface

**Application layer:**
- `apps/cli/src/application/useCases/CreateCommandFromPlaybookUseCase.ts` - use case implementation

**Infrastructure layer:**
- `apps/cli/src/infra/commands/CreateCommandCommand.ts` - cmd-ts command
- `apps/cli/src/infra/commands/createCommandHandler.ts` - handler logic
- `apps/cli/src/infra/commands/CommandsCommand.ts` - parent subcommand
- `apps/cli/src/infra/utils/commandPlaybookValidator.ts` - validation utility
- `apps/cli/src/infra/utils/readCommandPlaybookFile.ts` - file reading utility

### Files to Modify

**Domain layer:**
- `apps/cli/src/domain/repositories/IPackmindGateway.ts` - add `createCommand` method and types

**Infrastructure layer:**
- `apps/cli/src/infra/repositories/PackmindGateway.ts` - implement `createCommand`
- `apps/cli/src/infra/commands/index.ts` - register `commandsCommand`

## Gateway Integration

### Types

```typescript
export type CreateCommandCommand = {
  name: string;
  summary: string;
  whenToUse: string[];
  contextValidationCheckpoints: string[];
  steps: Array<{ name: string; description: string; codeSnippet?: string }>;
};

export type CreateCommandResult = {
  id: string;
  name: string;
  slug: string;
};
```

### API Endpoint

Uses existing endpoint: `POST /api/v0/organizations/:orgId/spaces/:spaceId/recipes`

The `CaptureRecipeCommand` already supports all required fields.

## Output

### Success

```
Command "Setup React Component" created successfully (ID: 563720c7-952d-48a6-afef-70f56e5aa41b)

View it in the webapp: https://app.packmind.ai/org/my-org/space/global/commands/563720c7-952d-48a6-afef-70f56e5aa41b
```

### Error Scenarios

1. File not found → `Error: File not found: ./path/to/file.json`
2. Invalid JSON → `Error: Invalid JSON in file: <parse error>`
3. Validation failure → `Error: Invalid playbook: <zod error messages>`
4. Not logged in → `Error: Not logged in. Run 'packmind login' first.`
5. API error → `Error: Failed to create command: <API error message>`

## Webapp URL Construction

URL format: `https://app.packmind.ai/org/{orgSlug}/space/global/commands/{commandId}`

Components extracted from:
- `host` - from decoded API key
- `orgSlug` - from JWT payload (`jwt.organization.slug`)
- `commandId` - from API response

## Testing Strategy

- Unit tests for `CommandPlaybookDTO` validation
- Unit tests for `CreateCommandFromPlaybookUseCase`
- Unit tests for `createCommandHandler`
- Integration tests for `PackmindGateway.createCommand`
