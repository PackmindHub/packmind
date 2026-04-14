---
name: use-ioutput-in-cli-commands
description: This skill should be used when writing or migrating CLI commands in apps/cli/ that currently use consoleLogger.ts functions (logConsole, logErrorConsole, logSuccessConsole, etc.) and need to be updated to use the IOutput abstraction via packmindCliHexa.output instead.
---

# Use IOutput in CLI Commands

## Overview

CLI commands in `apps/cli/` must use the `IOutput` interface (`apps/cli/src/domain/repositories/IOutput.ts`) for all user-facing output instead of the legacy `consoleLogger.ts` utilities. `IOutput` is accessed via `packmindCliHexa.output` and provides structured methods for notifications, loaders, and artefact listings that are testable and consistent.

Load `references/migration-guide.md` for the full function mapping table, interface definition, and before/after code examples.

## When to Apply

Apply this skill whenever:
- A command file imports from `../utils/consoleLogger` or `../../utils/consoleLogger`
- A new command is being written and output needs to be added
- Tests need to assert on CLI output behavior

## Migration Workflow

### 1. Audit imports

To identify what needs replacing, search for `consoleLogger` imports in the command file:

```
grep -n "consoleLogger" <file>
```

### 2. Map each call to IOutput

Use the mapping table in `references/migration-guide.md`. The most common substitutions:

- `logConsole(msg)` / `logInfoConsole(msg)` → `output.notifyInfo(msg)`
- `logErrorConsole(msg)` → `output.notifyError(msg)`
- `logSuccessConsole(msg)` → `output.notifySuccess(msg)`
- `logWarningConsole(msg)` → `output.notifyWarning(msg)`
- Manual "status text" before `await` → `output.withLoader(label, asyncFn)`
- Manual loop rendering items → `output.listArtefacts(title, items)`
- Manual grouped item loop → `output.listScopedArtefacts(title, groups)`

### 3. Consolidate message + hint into HelpMessage

When the old code logs a primary message followed by a secondary hint or example command, consolidate into a single `IOutput` call using the optional `HelpMessage` argument:

```typescript
// BEFORE
logErrorConsole('Command removed.');
logConsole(`Use ${formatCommand('packmind-cli playbook add <path>')} instead.`);

// AFTER
output.notifyError('Command removed.', {
  content: 'Use the "playbook add" command instead:',
  exampleCommand: 'packmind-cli playbook add .packmind/commands/my-command.md',
});
```

### 4. Wrap async calls with withLoader

Replace manual "Fetching…" log calls before `await` with `withLoader`:

```typescript
// BEFORE
logConsole('Fetching commands...\n');
const commands = await packmindCliHexa.listCommands({});

// AFTER
const commands = await packmindCliHexa.output.withLoader(
  'Fetching commands',
  () => packmindCliHexa.listCommands({}),
);
```

### 5. Remove the consoleLogger import

After replacing all usages, remove the import line:

```typescript
// DELETE this line
import { logConsole, logErrorConsole, ... } from '../utils/consoleLogger';
```

Also remove any `formatCommand`, `formatHeader`, `formatSlug`, etc. imports that are no longer needed after the migration.

### 6. Update tests

Replace direct console spy assertions with mock output assertions. Use `createMockOutput()` from `apps/cli/src/mocks/createMockRepositories.ts` and inject it via `packmindCliHexa.output`. See `references/migration-guide.md` for a full test example.

## Artefact Shape

When calling `listArtefacts` or `listScopedArtefacts`, map domain objects to the `Artefact` type:

```typescript
{
  title: string;      // display name shown to user
  slug: string;       // identifier shown below title
  description?: string;
  url?: string | null; // link shown if present
}
```

## Resources

- `references/migration-guide.md` — full function mapping, interface definition, before/after examples, and testing patterns