# Packmind Onboarding Skill

Read-only codebase analysis skill that identifies non-linter architectural patterns and generates draft Packmind Standards and Commands.

## What It Does

1. **Detects existing configuration** - Shows what's already configured (standards, commands, agent docs)
2. **Detects your stack** - Language, monorepo structure, architecture markers
3. **Analyzes for non-linter patterns** - 4 architectural analyses across code organization, workflows, and testing
4. **Generates draft artifacts** - Max 5 Standards and 5 Commands per run
5. **Applies on your choice** - Nothing written without explicit confirmation

**Works with any language** - JavaScript, TypeScript, Python, Go, Ruby, Java, and more.

## Available Analyses

| Category              | Analyses                                       |
| --------------------- | ---------------------------------------------- |
| **Infrastructure**    | CI/Local Workflow Parity                       |
| **Code Organization** | File Template Consistency, Role Taxonomy Drift |
| **Testing**           | Test Data Construction                         |

## Usage

Ask your AI agent to onboard:

- "Onboard this project to Packmind"
- "Analyze this codebase for standards"
- "Generate coding standards for this project"

## What You'll Discover

- **Test data patterns**: "23 factories with 1166 usages across test files"
- **File boilerplate**: "All UseCases extend AbstractMemberUseCase with same structure"
- **Workflow gaps**: "CI runs security scan, no local equivalent"
- **Role drift**: "3 role definitions with inconsistent naming across modules"

## What It Skips (Linter-Enforceable)

- ESLint disable counts
- TypeScript strict violations
- Formatting issues
- Import ordering

## License

Apache 2.0 - See LICENSE.txt for details.
