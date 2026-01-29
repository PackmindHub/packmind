# Packmind Onboarding Skill

Read-only codebase analysis skill that identifies non-linter architectural patterns and generates draft Packmind Standards and Commands.

## What It Does

1. **Detects existing configuration** - Shows what's already configured (standards, commands, agent docs)
2. **Detects your stack** - Language, monorepo structure, architecture markers
3. **Analyzes for non-linter patterns** - 17 architectural analyses across dependencies, data flow, concurrency, and more
4. **Generates draft artifacts** - Max 5 Standards and 5 Commands per run
5. **Applies on your choice** - Nothing written without explicit confirmation

**Works with any language** - JavaScript, TypeScript, Python, Go, Ruby, Java, and more.

## Available Analyses

| Category | Analyses |
|----------|----------|
| **Architecture** | Module Boundaries, Shared Kernel Drift, Public API Discipline, Cross-Cutting Hotspots |
| **Communication** | Cross-Domain Communication, Error Semantics |
| **Data** | Data Boundary Leakage, Schema Generation Boundary, Transaction Conventions |
| **Infrastructure** | CI/Local Workflow Parity, Config & Feature Flags, Observability Contract |
| **Code Organization** | File Template Consistency, Role Taxonomy Drift, Authorization Boundaries |
| **Testing** | Test Data Construction |
| **Concurrency** | Concurrency Style Consistency |

## Usage

Ask your AI agent to onboard:
- "Onboard this project to Packmind"
- "Analyze this codebase for standards"
- "Generate coding standards for this project"

## What You'll Discover

- **Architecture patterns**: "Event-driven communication via domain events"
- **Dependency violations**: "15 deep imports bypassing module entrypoints"
- **Test data patterns**: "23 factories with 1166 usages across test files"
- **File boilerplate**: "All UseCases extend AbstractMemberUseCase with same structure"
- **Workflow gaps**: "CI runs security scan, no local equivalent"
- **Structure consistency**: "12 packages follow hexagonal, 2 don't"

## What It Skips (Linter-Enforceable)

- ESLint disable counts
- TypeScript strict violations
- Formatting issues
- Import ordering

## License

Apache 2.0 - See LICENSE.txt for details.
