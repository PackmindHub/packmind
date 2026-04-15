# Packmind Standards Index

This standards index contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards

- [Changelog](./standards/changelog.md) : Maintain CHANGELOG.MD using Keep a Changelog format with a top [Unreleased] section linked to HEAD, ISO 8601 dates (YYYY-MM-DD), and per-release comparison links like [X.Y.Z]: https://github.com/PackmindHub/packmind/compare/release/<previous>...release/X.Y.Z to ensure accurate, consistent release documentation and version links.
- [Compliance - Logging Personal Information](./standards/compliance-logging-personal-information.md) : Enforce masking of personal information in TypeScript logs, using a standard first-6-characters-plus-* format for emails and similar patterns for other identifiers, to protect user privacy, comply with data protection regulations, and reduce security risks when handling user-related log entries.
- [Typescript good practices](./standards/typescript-good-practices.md) : Enforce TypeScript error and DTO conventions by prohibiting Object.setPrototypeOf in custom errors and requiring intersection types (DomainType & { extraField: T }) for presentation DTO enrichment to improve reliability and catch domain-field drift at compile time.


---

*This standards index was automatically generated from deployed standard versions.*