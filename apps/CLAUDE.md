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

### Application-Specific Guidance

Each application has its own CLAUDE.md file with specific architecture, technologies, commands, and key patterns:

- See `api/CLAUDE.md` for backend API guidance
- See `frontend/CLAUDE.md` for frontend SPA guidance
- See `cli/CLAUDE.md` for CLI tool guidance
- See `mcp-server/CLAUDE.md` for MCP server guidance
- See `e2e-tests/CLAUDE.md` for E2E testing guidance
- See `doc/CLAUDE.md` for documentation guidance

## General Patterns

- All applications share domain packages from `packages/`
- All TypeScript code follows standards in `.claude/rules/packmind/`
- All testing follows standards in `.claude/rules/packmind/standard-testing-good-practices.md`
