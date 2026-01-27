# Packages

This directory contains reusable domain and infrastructure packages shared across applications.

## Package Architecture

Most domain packages follow hexagonal (ports & adapters) architecture:

- **Domain Layer**: Entities, value objects, domain events
- **Application Layer**: Use cases orchestrating business logic
- **Infrastructure Layer**: Repository implementations, external adapters

Packages are designed to be independent, testable, and composable.

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

### Dependency Rules

- Packages should minimize dependencies on other packages
- Domain packages depend only on core infrastructure packages
- Integration packages can depend on domain packages
- Avoid circular dependencies between packages

### Adding a New Package

- Create package in `packages/` directory
- Define `project.json` with Nx configuration
- Update TypeScript path mappings in root `tsconfig.base.json`
- Follow package architecture pattern (hexagonal for domain packages)
- Add exports to `index.ts` for public API

## Testing Strategy

- Unit tests: Test domain logic and use cases in isolation
- Integration tests: Test repository implementations and external adapters
- Use test factories from `test-utils` for consistent test data
- Follow standards in `.claude/rules/packmind/standard-testing-good-practices.md`

## TypeORM Entity Packages

Domain packages containing TypeORM entities:

- **accounts** - UserEntity
- **spaces** - SpaceEntity, MemberEntity
- **standards** - StandardEntity, RuleEntity
- **recipes** - RecipeEntity, StepEntity
- **skills** - SkillEntity

Entities use TypeORM decorators and are registered in API and MCP server TypeORM config.

## Related Documentation

- See `.claude/rules/packmind/` for coding standards
- See `.claude/skills/packmind:create-new-package-in-monorepo/` for package creation skill
- See root `CLAUDE.md` for monorepo-wide rules
- See individual package README files for package-specific details
