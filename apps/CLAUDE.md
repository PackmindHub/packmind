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
| `cli-e2e-tests` | only `test` (jest config, no eslint config). |
| `e2e-tests` | run via `pnpm run e2e`, not Nx. |
| `packmind-cli` | see `cli/CLAUDE.md` — `build` produces a bundle, `build-executable-*` produce binaries. |

Check with `./node_modules/.bin/nx show project <app-name>` rather than reading `project.json`, since
most targets are inferred by Nx plugins.
