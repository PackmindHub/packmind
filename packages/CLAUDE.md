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
- **recipes** - Multi-step coding recipe definitions and execution
- **skills** - AI agent skill definitions and management
- **editions** - Product edition management (OSS, Enterprise, etc.)

### Integration & Deployment

- **git** - Git repository operations for standards and recipe deployment
- **deployments** - Deployment pipeline for distributing standards, recipes, and skills to AI agents
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

## Working with Packages

### Common Nx Commands

- Build a package: `nx build <package-name>`
- Test a package: `nx test <package-name>`
- Lint a package: `nx lint <package-name>`