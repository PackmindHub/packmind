# Packages

This directory contains reusable domain and infrastructure packages shared across applications.

## Package Categories

### Core Infrastructure

- **types** - Shared TypeScript types and interfaces used across packages and apps
- **logger** - Logging utilities with console and structured output support
- **node-utils** - Node.js utility functions for file system, path manipulation, and common operations
- **test-utils** - Test factories, fixtures, and utilities for consistent test data creation
- **migrations** - TypeORM database migrations for schema evolution

### Domain Packages

- **accounts** - User account management, authentication, and user profiles
- **spaces** - Workspace management, space members, roles, and permissions
- **standards** - Coding standards creation, storage, and retrieval
- **commands** - Multi-step coding command definitions and execution (formerly "recipes")
- **skills** - AI agent skill definitions and management
- **editions** - Product edition management (OSS, Enterprise, etc.)
- **feature-flags** - Shared, browser-safe feature-flag registry and decision logic (consumed by both frontend and backend)
- **playbook-change-applier** - Applies proposed changes to playbook artifacts (standards, commands, skills)

### Integration & Deployment

- **git** - Git repository operations for standards and command deployment
- **deployments** - Deployment pipeline for distributing standards, commands, and skills to AI agents
- **coding-agent** - AI coding agent integration and rendering for multiple agent types (Claude Code, Cursor, etc.)

### Language Analysis

- **linter-ast** - Abstract syntax tree (AST) analysis and manipulation utilities
- **linter-execution** - Linting rule execution engine for coding standards
- **llm** - Large language model integration for AI-powered features

### Frontend

- **frontend** - Shared frontend utilities, hooks, and contexts
- **ui** - Reusable UI components with Chakra UI (PM-prefixed components)

### Supporting

- **assets** - Static assets, WASM files, and embedded resources
- **integration-tests** - Cross-package integration test suites (deployments, standards, tracked repositories, etc.)

## Working with Packages

### Common Nx Commands

- Build a package: `./node_modules/.bin/nx build <package-name>`
- Test a package: `./node_modules/.bin/nx test <package-name>`
- Lint a package: `./node_modules/.bin/nx lint <package-name>`

**Example packages**: `types`, `logger`, `accounts`, `standards`, `ui`, `node-utils`, `test-utils`