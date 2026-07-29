# Applications

This directory contains all deployable applications in the Packmind monorepo.

## Application Categories

### Backend Services

- **api** - Main NestJS backend API with hexagonal architecture, TypeORM, and BullMQ

### Frontend & CLI

- **frontend** - React Router v7 SPA with Chakra UI, TanStack Query, and file-based routing
- **cli** - Command-line interface built with cmd-ts and tree-sitter parsers (Nx project name: `packmind-cli`)
- **playground** - Vite-based sandbox for building and reviewing UI/UX prototypes

### Testing & Documentation

- **e2e-tests** - Playwright end-to-end tests with Page Object Model
- **cli-e2e-tests** - Jest-based end-to-end tests for the CLI against a real binary and API
- **doc** - Mintlify-based end-user documentation

## Working with Applications

### Common Nx Commands

- Build an application: `./node_modules/.bin/nx build <app-name>`
- Test an application: `./node_modules/.bin/nx test <app-name>`
- Lint an application: `./node_modules/.bin/nx lint <app-name>`

> Not every project exposes every target: `cli-e2e-tests` only supports `test` (no `build`/`lint`), and `e2e-tests` is run via `pnpm run e2e` rather than Nx. Use `./node_modules/.bin/nx show project <app-name>` to see a project's available targets.

**Available applications**: `api`, `frontend`, `packmind-cli`, `playground`, `e2e-tests`, `cli-e2e-tests`, `doc`
