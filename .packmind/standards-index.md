# Packmind Standards Index

This standards index contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards

- [Changelog](./standards/changelog.md) : Maintain CHANGELOG.MD using Keep a Changelog format with a top [Unreleased] section linked to HEAD, ISO 8601 dates (YYYY-MM-DD), and per-release comparison links like [X.Y.Z]: https://github.com/PackmindHub/packmind/compare/release/<previous>...release/X.Y.Z to ensure accurate, consistent release documentation and version links.
- [Testing good practices](./standards/testing-good-practices.md) : Standardize unit test structure and naming in TypeScript/TSX test files using verb-first descriptions, Arrange-Act-Assert flow without comments, nested describe('when...') context blocks, and single-expect test cases to improve readability, maintainability, and debugging.
- [Typescript good practices](./standards/typescript-good-practices.md) : Prohibit using `Object.setPrototypeOf` when defining TypeScript errors to avoid performance penalties and ensure consistent error behavior.


---

*This standards index was automatically generated from deployed standard versions.*