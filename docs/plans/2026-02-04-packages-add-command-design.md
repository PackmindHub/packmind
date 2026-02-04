# Design: `packmind packages add` Command

**Date:** 2026-02-04
**Branch:** `feat/cli-add-to-packages`

## Overview

Implement a CLI command to add standards, commands, or skills to an existing package using the PATCH `/package` API route.

## Command Interface

**Signature:**
```bash
packmind packages add --to <package-slug> [--standard <slug>]... [--command <slug>]... [--skill <slug>]...
```

**Validation rules:**
- `--to` is required
- At least one item flag is required
- Only one item type per invocation (error if mixing types)

**Examples:**
```bash
# Add one standard
packmind packages add --to frontend-standards --standard api-error-handling

# Add multiple standards
packmind packages add --to frontend-standards --standard api-error-handling --standard naming-conventions

# Add commands
packmind packages add --to my-recipes --command deploy-staging --command run-migrations
```

**Output:**
```
✓ Added api-error-handling to frontend-standards
⚠ naming-conventions already in frontend-standards (skipped)
```

## Architecture

Following the hexagonal architecture pattern in the CLI:

| Component | File |
|-----------|------|
| Command Handler | `apps/cli/src/commands/packages/add.command.ts` |
| Use Case | `apps/cli/src/application/usecases/addToPackage.usecase.ts` |
| Gateway Method | Add `addItemsToPackage()` to `PackagesGateway` or `IPackmindGateway` |

## API Integration

**Gateway method signature:**
```typescript
interface IPackagesGateway {
  addItemsToPackage(params: {
    packageSlug: string;
    itemType: 'standard' | 'command' | 'skill';
    itemSlugs: string[];
  }): Promise<{ added: string[]; skipped: string[] }>;
}
```

**Expected PATCH `/package` response:**
```typescript
{
  added: string[];      // Items successfully added
  skipped: string[];    // Items already in package (duplicates)
}
```

## Skill Update

Update `packmind-cli-usage` skill to guide Claude on using the command:

1. Execute `packmind packages add` with appropriate flags
2. Report output to user
3. Use `AskUserQuestion` to prompt: "Would you like me to run `packmind install` to sync the changes?"
4. If yes, run `packmind install`

## Documentation

Add to CLI documentation:

### packmind packages add

Add standards, commands, or skills to an existing package.

**Usage:**
```bash
packmind packages add --to <package-slug> [--standard <slug>]... [--command <slug>]... [--skill <slug>]...
```

**Options:**
- `--to` (required) - Target package slug
- `--standard` - Standard slug(s) to add (repeatable)
- `--command` - Command slug(s) to add (repeatable)
- `--skill` - Skill slug(s) to add (repeatable)

**Note:** Only one item type per command. To add different types, run separate commands.

## Deliverables

- [ ] Command handler with flag parsing and validation
- [ ] Use case with business logic
- [ ] Gateway method calling PATCH `/package`
- [ ] Unit tests for command, use case, and gateway
- [ ] Skill update with AskUserQuestion flow
- [ ] CLI documentation update

## Out of Scope

- Backend changes (PATCH route already exists)
- Interactive CLI prompts (handled by skill via AskUserQuestion)
