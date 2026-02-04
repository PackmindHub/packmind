# Design: Adding Items to Packages via CLI

**Date:** 2026-02-03
**Status:** Draft

## Overview

Enable users to add commands, standards, and skills to packages through the CLI, supporting both "bundle immediately after creation" and "organize existing items later" workflows.

### Two Primary Entry Points

**Flow A: Post-Creation Prompt**
After creating a command/standard/skill, if the user has at least one package, prompt to add the item to a package.

**Flow B: Dedicated Command**
Explicit `packmind packages add` command for organizing existing items into packages.

## Command Syntax

### `packmind packages add`

```bash
packmind packages add [options]

Options:
  --command <slug>    Add a command to the package
  --standard <slug>   Add a standard to the package
  --skill <slug>      Add a skill to the package
  --to <package>      Target package (slug or name)
  --no-interactive    Disable prompts, fail if args missing
```

**Rules:**
- Exactly one item type flag required (`--command`, `--standard`, or `--skill`)
- `--to` is required (prompted if missing in interactive mode)
- In non-TTY environments, all args must be explicit or command fails with usage help

### Future Extension (Not in v1)

```bash
# Multiple items - designed but not implemented
packmind packages add --commands a,b,c --to my-package
```

### Designed for Later: `packmind packages remove`

```bash
packmind packages remove --command <slug> --from <package>
```

Same structure as `add`, with `--from` instead of `--to` for clarity.

## Interactive Wizard Flow

### Full Wizard (No Arguments)

```
$ packmind packages add

? What would you like to add?
  › Command
    Standard
    Skill

? Select a command:
  › api-error-handling
    form-validation
    auth-flow
    (type to filter...)

? Select target package:
  › frontend-standards
    backend-guidelines
    Create new package...

✓ Command 'api-error-handling' added to 'frontend-standards'
```

### Partial Argument Filling

If user provides `--command` but not `--to`:

```
$ packmind packages add --command api-error-handling

? Select target package:
  › frontend-standards
    backend-guidelines
    Create new package...

✓ Command 'api-error-handling' added to 'frontend-standards'
```

### Inline Package Creation

```
? Select target package:
  › Create new package...

? Package name: my-new-package
? Description (optional): Guidelines for API development

✓ Package 'my-new-package' created
✓ Command 'api-error-handling' added to 'my-new-package'
```

### TTY Detection

- **TTY available:** Interactive prompts enabled
- **Non-TTY (CI/scripts):** All args must be explicit, fails with usage help if missing

## Post-Creation Prompt Integration

After successful creation of a command/standard/skill:

1. Check if TTY is available (interactive mode)
2. Check if user has at least one package

If both true, prompt:

```
$ packmind commands create ./my-command.json

✓ Command 'api-error-handling' created successfully
  View at: https://app.packmind.com/commands/api-error-handling

? Add to a package?
  › frontend-standards
    backend-guidelines
    Create new package...
    Skip

✓ Added to 'frontend-standards'
```

### When No Packages Exist

No prompt. Show a tip instead:

```
✓ Command 'api-error-handling' created successfully

Tip: Create a package to bundle your commands for distribution:
     packmind packages create <name>
```

### Bypass Flag

```bash
packmind commands create ./cmd.json --no-add-to-package
```

## Skill Updates for Agent Workflows

Update `packmind-create-command`, `packmind-create-standard`, and `packmind-create-skill` skills with a package assignment step.

### New Step: Package Assignment (Before Saving)

Before calling the save tool, the agent should ask the user:

> "Would you like to add this [command/standard/skill] to a package?"

**If yes:**
1. List available packages using `mcp__packmind__list_packages`
2. Let user select one or more packages
3. Include selected package slugs in the `packageSlugs` parameter when calling the save tool

**If no:**
- Proceed with save without `packageSlugs`

### Document CLI Alternative

Skills should also mention:

```
Users can manage package contents via CLI:
- packmind packages add --command <slug> --to <package>
- packmind packages add --standard <slug> --to <package>
- packmind packages add --skill <slug> --to <package>
```

## Error Handling

### Duplicate Addition

```
$ packmind packages add --command api-error-handling --to frontend-standards

⚠ Command 'api-error-handling' is already in 'frontend-standards'
```

Exit code 0, warning message (idempotent behavior).

### Item Not Found

```
$ packmind packages add --command non-existent --to frontend-standards

✗ Command 'non-existent' not found
  Run 'packmind commands list' to see available commands
```

Exit code 1.

### Package Not Found

```
$ packmind packages add --command api-error-handling --to non-existent

✗ Package 'non-existent' not found
  Run 'packmind packages list' to see available packages
```

Exit code 1.

### Non-TTY with Missing Args

```
$ packmind packages add --command api-error-handling
# (in CI, no TTY)

✗ Missing required argument: --to <package>
  Usage: packmind packages add --command <slug> --to <package>
```

Exit code 1.

## API & Gateway Layer

### Current State

The backend API already supports adding items to packages via PATCH:

```
PATCH /organizations/{orgId}/spaces/{spaceId}/packages/{packageId}
Body: { recipeIds[], standardIds[], skillIds[] }
```

### New Gateway Method

```typescript
// IPackagesGateway.ts
interface IPackagesGateway {
  // ... existing methods

  addItem(
    packageSlug: string,
    item: { type: 'command' | 'standard' | 'skill'; slug: string }
  ): Promise<AddItemResult>;
}

type AddItemResult =
  | { success: true; alreadyExists: false }
  | { success: true; alreadyExists: true }
  | { success: false; error: 'item-not-found' | 'package-not-found' };
```

### Implementation Approach

1. Fetch current package contents via `getSummary`
2. Resolve item slug to ID via respective gateway (`commands.list`, `standards.list`, `skills.list`)
3. Merge new item ID into existing array
4. Call PATCH endpoint with updated arrays

## Implementation Order

### Phase 1: Core `packages add` Command

1. Add `addItem` method to `PackagesGateway`
2. Create `AddItemToPackageUseCase`
3. Create `AddToPackageCommand` with flag-based syntax
4. Implement interactive wizard (TTY detection, prompts)
5. Add "Create new package..." inline flow

### Phase 2: Post-Creation Prompt Integration

1. Update `createCommandHandler` to check for packages and prompt
2. Update `createStandardHandler` same way
3. Update `createSkillHandler` same way
4. Add `--no-add-to-package` flag to skip prompt

### Phase 3: Skill Documentation Updates

1. Update `packmind-create-command` skill with package assignment step
2. Update `packmind-create-standard` skill with package assignment step
3. Update `packmind-create-skill` skill with package assignment step

### Phase 4: Future (Not Now)

- `packages remove` command
- Batch additions (`--commands a,b,c`)

## Summary

| Feature | Description |
|---------|-------------|
| `packmind packages add` | New command with `--command/--standard/--skill` and `--to` flags |
| Interactive wizard | Full wizard when no args, partial prompts for missing args |
| TTY detection | Prompts only for humans, explicit args required in CI |
| Post-creation prompt | "Add to package?" after creating items (if packages exist) |
| Inline package creation | "Create new package..." option in all prompts |
| Skill updates | Guide agents to ask about packages before saving |

**Not building yet:**
- `packages remove` (designed, shipped later)
- Batch additions (future extension)
- Changes to `packages create` (stays minimal)

**Key behaviors:**
- Duplicate additions → warning, exit 0
- Missing items/packages → error, exit 1
- No packages exist → tip instead of prompt
