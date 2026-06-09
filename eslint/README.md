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
  (`class CommitToGit` → `CommitToGitUseCase`).

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

It runs as part of `npm run lint` (`nx run-many -t lint`).

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
