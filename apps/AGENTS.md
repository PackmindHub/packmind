# Applications

This directory contains all deployable applications in the Packmind monorepo.

## Application Categories

### Backend Services

- **api** - Main NestJS backend API with hexagonal architecture, TypeORM, and BullMQ
- **mcp-server** - Model Context Protocol server exposing Packmind capabilities to AI agents

### Frontend & CLI

- **frontend** - React Router v7 SPA with Chakra UI, TanStack Query, and file-based routing
- **cli** - Command-line interface built with cmd-ts and tree-sitter parsers

### Testing & Documentation

- **e2e-tests** - Playwright end-to-end tests with Page Object Model
- **doc** - Mintlify-based end-user documentation

## Working with Applications

### Common Nx Commands

- Build an application: `nx build <app-name>`
- Test an application: `nx test <app-name>`
- Lint an application: `nx lint <app-name>`
- Serve/dev an application: `nx serve <app-name>` or `nx dev <app-name>`
