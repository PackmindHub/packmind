# Packmind Standards Index

This standards index contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards

- [Amplitude analytics usage](./standards/amplitude-analytics-usage.md) : * We use Amplitude to get insights about users' behavior when using our product with the different UI (CLI / MCP / web app).
* Only in "cloud" environment (no tracking in open-source deployments)
* Data hosted in EU
* No user related data tracked
- [Backend Tests Redaction](./standards/backend-tests-redaction.md) : This standard establishes best practices for writing backend tests using Jest in the Packmind monorepo. It focuses on clarity, maintainability, and consistency across test suites by emphasizing behavioral testing, proper test organization, and effective use of testing utilities. Apply these rules when writing or refactoring backend unit tests, integration tests, and service tests to ensure tests remain readable, reliable, and easy to debug.
- [Changelog](./standards/changelog.md) : Maintain a consistent and well-structured CHANGELOG.MD file following the Keep a Changelog format to ensure all releases are properly documented with accurate version links and dates. This standard applies whenever creating or updating the CHANGELOG.MD file in the repository root.
- [Compliance - Logging Personal Information](./standards/compliance-logging-personal-information.md) : This standard ensures personal information is not exposed in application logs across all environments (development, staging, and production). Logs are often forwarded to external processors such as Datadog, making it critical to prevent leaking sensitive user data. By masking personal information in logs, we maintain user privacy, comply with data protection regulations, and reduce security risks. This standard applies when logging user-related information, debugging authentication flows, tracking user actions, or handling error scenarios involving personal data.
- [Packmind Proprietary](./standards/packmind-proprietary.md) : .
- [Typescript good practices](./standards/typescript-good-practices.md) : Generic practices that can be applied for all TS code in our app


---

*This standards index was automatically generated from deployed standard versions.*