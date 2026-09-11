# Applications

This directory contains all deployable applications in the Packmind monorepo.

## Application Categories

### Backend Services

- **api** - Main NestJS backend API with hexagonal architecture, TypeORM, and BullMQ

### Frontend & CLI

- **frontend** - React Router v8 SPA
- **cli** - Command-line interface built with cmd-ts (Nx project name: `packmind-cli`)
- **playground** - UI/UX prototype sandbox — see the `working-with-playground-app` skill, which owns
  how to run it and the rules for building a prototype. There is intentionally no
  `apps/playground/CLAUDE.md`.

### Testing & Documentation

- **e2e-tests** - Playwright end-to-end tests with Page Object Model
- **cli-e2e-tests** - Jest-based end-to-end tests for the CLI against a real binary and API
- **doc** - Mintlify-based end-user documentation

## Working with Applications

The generic `nx build|test|lint <name>` commands are in the root `CLAUDE.md`. What matters here is
that **several apps do not have all three**:

| App | Reality |
| --- | --- |
| `doc` | declares only `dev`. No `build`, `test` or `lint`. |
| `playground` | `dev`/`build`/`preview`/`typecheck` inferred from `vite.config.ts`; **no** `test` or `lint` (no jest or eslint config). |
| `cli-e2e-tests` | `test` (jest) plus `lint` and `typecheck`. No `build`. |
| `e2e-tests` | the suite runs via `pnpm run e2e`, not Nx; `lint` and `typecheck` are Nx targets. |
| `packmind-cli` | see `cli/CLAUDE.md` — `build` produces a bundle, `build-executable-*` produce binaries. |

Check with `./node_modules/.bin/nx show project <app-name>` rather than reading `project.json`, since
most targets are inferred by Nx plugins.

### Type-checking the two e2e suites

Neither suite's specs are compiled by anything that checks types: Playwright and `@swc/jest` each
strip types per file at run time. `nx typecheck e2e-tests` and `nx typecheck cli-e2e-tests` are
therefore the only gate on them, and unlike the shared `typecheck` in `nx.json` (which compiles
`tsconfig.lib.json`) they are spelled out in each `project.json` and cover **every** `.spec.ts`.
CI runs both in `build.yml`'s `build-packages` job. Add a spec and it is picked up automatically —
both tsconfigs glob the whole source tree rather than listing files.

`apps/e2e-tests/tsconfig.json` extends the generated `tsconfig.base.effective.json`, so run
`node scripts/select-tsconfig.mjs` once (with `PACKMIND_EDITION` set) before typechecking a fresh
checkout.
