# Workspace ESLint rules (`eslint-rules`)

Local ESLint plugin holding Packmind workspace-specific lint rules. Authored as
plain CommonJS so the root ESM `eslint.config.mjs` can import it directly (no build step).

## Rules

### `packmind/use-case-filename` — structural

Enforces use-case _structure_ for files under `application/useCases/`:

- `legacyFilename` — filename uses the legacy dotted `.usecase` suffix
  (`addGitRepo.usecase.ts` → `AddGitRepoUseCase.ts`). The original extension
  (`.ts` / `.tsx`) is preserved in the suggestion.
- `classMissingSuffix` — exported, non-`Error` class does not end in `UseCase`
  (`class CommitToGit` → `CommitToGitUseCase`). Escape hatch: a legitimate helper
  class (mapper/DTO/builder) belongs under a `shared/` subfolder, which is exempt.

Not flagged: error classes (`extends Error` or named `*Error`), non-exported
classes, files with no exported class (helpers like `utils.ts`), and mis-cased
`Usecase` names (left to `usecase-casing`).

Scope: `**/application/useCases/**/*.ts` (excluding `shared/**` and `index.ts`),
and only under `packages/` — `apps/*` are out of scope because they may co-locate
non-use-case classes under `useCases/` (e.g. the CLI's diff strategies).

### `packmind/usecase-casing` — casing (repo-wide)

The use-case concept is spelled `UseCase`, never `Usecase`. This rule runs across
the whole repo and flags the mis-cased `Usecase` in:

- `filenameCasing` — filenames (`CaptureRecipeUsecase.ts` → `CaptureRecipeUseCase.ts`)
- `identifierCasing` — identifiers: class names, variables, parameters, properties,
  type/interface names (`captureRecipeUsecase` → `captureRecipeUseCase`).

Only PascalCase-style `Usecase` (capital "U", lowercase "c") is flagged; the
all-lowercase legacy `usecase` file suffix is handled by `use-case-filename`.

### `packmind/throw-kind-carrying-error` — type-aware

Every value thrown from a package's `src/domain/` or `src/application/`, and
from anywhere in `packages/types/src/` (which has no such layers, yet holds
errors and helpers that use cases throw through), must pass the guards `DomainExceptionFilter` uses (`isDomainError`, `isInternalError`,
`isUpstreamError`): a required, known `kind`, a required string `reason`, and —
for internal and upstream kinds — an `Error` instance. Anything else answers 500.
The rule reads the thrown value's type, so it follows `kind` through base
classes declared in other files — which is why it needs type information
(`parserOptions.projectService`) and is scoped to those files only. Specs and
tests are out of scope everywhere.

Not flagged: rethrown values typed `any`/`unknown` (a bare `catch (error)`
rethrow), since their type is decided where they were first thrown. Out of
scope: `application/jobs/` and `application/listeners/`, which run outside the
HTTP scope.

Runs at `error`: every in-scope throw site carries a kind, so a new kindless
throw fails lint.

## Wiring

The plugin is registered in the root `eslint.config.mjs`:

```js
import packmind from './eslint/index.js';

// ...
{
  files: ['**/application/useCases/**/*.ts'],
  plugins: { packmind },
  rules: { 'packmind/use-case-filename': 'error' },
},
```

It runs as part of `pnpm run lint` (`nx run-many -t lint`).

## Tests

Unit-tested with ESLint's `RuleTester` (flat config). Run:

```bash
./node_modules/.bin/nx test eslint-rules
```

## Adding a rule

1. Add `rules/<rule-name>.js` (CommonJS, export the rule object).
2. Register it in `index.js` under `rules`.
3. Add `rules/<rule-name>.spec.ts` with `RuleTester` valid/invalid cases.
4. Enable it in the root `eslint.config.mjs`.
