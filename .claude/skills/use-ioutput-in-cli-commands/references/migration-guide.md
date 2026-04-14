# IOutput Migration Reference

## Key Files

| Role | Path |
|------|------|
| Interface | `apps/cli/src/domain/repositories/IOutput.ts` |
| Implementation | `apps/cli/src/infra/repositories/CliOutput.ts` |
| DI wiring | `apps/cli/src/PackmindCliHexaFactory.ts` |
| Access point | `apps/cli/src/PackmindCliHexa.ts` — `output` property |
| Test mock helper | `apps/cli/src/mocks/createMockRepositories.ts` — `createMockOutput()` |
| Old utilities (deprecated) | `apps/cli/src/infra/utils/consoleLogger.ts` |

---

## Function Mapping

| Old `consoleLogger` call | New `IOutput` call |
|--------------------------|-------------------|
| `logConsole(msg)` | `output.notifyInfo(msg)` |
| `logInfoConsole(msg)` | `output.notifyInfo(msg)` |
| `logWarningConsole(msg)` | `output.notifyWarning(msg)` |
| `logErrorConsole(msg)` | `output.notifyError(msg)` |
| `logSuccessConsole(msg)` | `output.notifySuccess(msg)` |
| Multiple sequential log calls for message + hint | Single call with `HelpMessage` second arg |
| Manual spinner/status text before async call | `output.withLoader(message, asyncFn)` |
| Manual loop over items with `logConsole` | `output.listArtefacts(title, items)` |
| Manual nested loop over groups | `output.listScopedArtefacts(title, scopedItems)` |

---

## IOutput Interface

```typescript
export type HelpMessage = {
  content: string;
  exampleCommand?: string;
  command?: string;
};

export type Artefact = {
  title: string;
  slug: string;
  description?: string;
  url?: string | null;
};

export interface IOutput {
  notifySuccess(message: string, help?: HelpMessage): void;
  notifyInfo(message: string, help?: HelpMessage): void;
  notifyWarning(message: string, help?: HelpMessage): void;
  notifyError(message: string, help?: HelpMessage): void;
  showLoader(message: string): void;
  withLoader<T>(message: string, loader: () => Promise<T>): Promise<T>;
  showArtefact(artefact: Artefact, help?: HelpMessage): void;
  listArtefacts(title: string, artefacts: Artefact[], help?: HelpMessage): void;
  listScopedArtefacts(
    title: string,
    scopedArtefacts: { title: string; artefacts: Artefact[] }[],
    help?: HelpMessage,
  ): void;
}
```

---

## Before / After Examples

### Simple notification

```typescript
// BEFORE
import { logErrorConsole } from '../utils/consoleLogger';
logErrorConsole('Something went wrong.');

// AFTER
packmindCliHexa.output.notifyError('Something went wrong.');
```

### Error with contextual hint

```typescript
// BEFORE
import { logErrorConsole, logConsole, formatCommand } from '../utils/consoleLogger';
logErrorConsole('Command "packmind-cli commands create" has been removed.');
logConsole(`Use ${formatCommand('packmind-cli playbook add <path>')} instead.`);

// AFTER
packmindCliHexa.output.notifyError(
  'Command "packmind-cli commands create" has been removed.',
  {
    content: 'Use the "playbook add" command instead:',
    exampleCommand: 'packmind-cli playbook add .packmind/commands/my-command.md',
  },
);
```

### Async operation with loader

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

### List display

```typescript
// AFTER — flat list
packmindCliHexa.output.listArtefacts(
  `Standards (${standards.length})`,
  standards.map((s) => ({
    title: s.name,
    slug: s.slug,
    url: buildUrl(s.id),
  })),
);

// AFTER — grouped list
packmindCliHexa.output.listScopedArtefacts(
  `Commands (${commands.length})`,
  groups.map(({ space, cmds }) => ({
    title: `Space: ${space.name}`,
    artefacts: cmds.map((cmd) => ({
      title: cmd.name,
      slug: cmd.slug,
      url: buildUrl(space.slug, cmd.id),
    })),
  })),
);
```

---

## Accessing `output` in a Command

`output` is exposed via `PackmindCliHexa.output`:

```typescript
// In any command handler:
const packmindLogger = new PackmindLogger('PackmindCLI', LogLevel.INFO);
const packmindCliHexa = new PackmindCliHexa(packmindLogger);

packmindCliHexa.output.notifySuccess('Done!');
```

---

## Testing with Mock Output

Use `createMockOutput()` from `apps/cli/src/mocks/createMockRepositories.ts`:

```typescript
import { createMockOutput } from '../../mocks/createMockRepositories';

const mockOutput = createMockOutput();
const mockHexa = {
  someMethod: jest.fn(),
  output: mockOutput,
} as unknown as jest.Mocked<PackmindCliHexa>;

// Assert output calls
expect(mockOutput.notifyError).toHaveBeenCalledWith(
  'Space "@unknown" not found.',
  expect.objectContaining({ content: expect.stringContaining('Available spaces') }),
);
```

`withLoader` in the mock automatically calls through to the loader function:
```typescript
withLoader: jest.fn().mockImplementation((_msg, loader) => loader()),
```