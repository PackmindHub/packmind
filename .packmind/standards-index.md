# Packmind Standards Index

This standards index contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards

- [Back-end TypeScript Clean Code Practices](./standards/back-end-typescript-clean-code-practices.md) : Establish back-end TypeScript clean code rules in the Packmind monorepo (/packages/**/*.ts)—including PackmindLogger constructor injection, disciplined logger.info/error usage, top-of-file static imports, custom Error subclasses, and adapter-created use cases with their own loggers—to improve maintainability, debuggability, and consistent architecture across services.
- [Changelog](./standards/changelog.md) : Maintain CHANGELOG.MD using Keep a Changelog format with a top [Unreleased] section linked to HEAD, ISO 8601 dates (YYYY-MM-DD), and per-release comparison links like [X.Y.Z]: https://github.com/PackmindHub/packmind/compare/release/<previous>...release/X.Y.Z to ensure accurate, consistent release documentation and version links.
- [Testing good practices](./standards/testing-good-practices.md) : Standardize unit test structure and naming in TypeScript/TSX test files using verb-first descriptions, Arrange-Act-Assert flow without comments, nested describe('when...') context blocks, and single-expect test cases to improve readability, maintainability, and debugging.
- [Typescript good practices](./standards/typescript-good-practices.md) : Enforce TypeScript error and DTO conventions by prohibiting Object.setPrototypeOf in custom errors and requiring intersection types (DomainType & { extraField: T }) for presentation DTO enrichment to improve reliability and catch domain-field drift at compile time.


---

*This standards index was automatically generated from deployed standard versions.*