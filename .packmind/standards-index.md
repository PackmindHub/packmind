# Packmind Standards Index

This standards index contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards

- [Backend Tests Redaction](./standards/backend-tests-redaction.md) : Enforce Jest backend test conventions in Packmind **/*.spec.ts (verb-first names, behavioral assertions, nested `describe('when...')`, one `expect`, `afterEach` cleanup with `datasource.destroy()` and `jest.clearAllMocks()`, `toEqual` for arrays, and `stubLogger()` for typed `PackmindLogger` stubs) to improve readability, consistency, and debuggability while preventing inter-test pollution.


---

*This standards index was automatically generated from deployed standard versions.*