# Workspace ESLint rules (`eslint-rules`)

Local ESLint plugin holding Packmind workspace-specific lint rules. Authored as
plain CommonJS so the root ESM `eslint.config.mjs` can import it directly (no build step).

## Rules

### `packmind/use-case-filename`

Enforces that use-case files are named in PascalCase (e.g. `AddGitRepoUseCase.ts`)
and rejects the legacy lowercase suffix form (`addGitRepo.usecase.ts`).

- Only reports on the forbidden `.usecase` / `.usecase.spec` / `.usecase.test` suffix,
  so helpers inside `useCases/` (`index.ts`, `utils.ts`, `shared/*`) are never flagged.
- The rule's scope (which files it runs against) is set by the `files` glob in the
  root `eslint.config.mjs` — currently `**/application/useCases/**/*.ts`.

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
