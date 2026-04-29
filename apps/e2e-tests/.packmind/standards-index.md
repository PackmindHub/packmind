# Packmind Standards Index

This standards index contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards

- [[E2E] Page object](./standards/e2e-page-object.md) : Define Playwright E2E PageObjects for each frontend route using regexp-based expectedUrl matching and mandatory this.pageFactory() after navigation to ensure safer URL validation and proper typing.
- [[E2E] Writing E2E tests](./standards/e2e-writing-e2e-tests.md) : Standardize Playwright E2E specs by creating one spec file per feature, using fixtures like testWithApi/testWithUser with API factories for irrelevant setup data and enabling feature flags via testWithApi.use({ underFeatureFlag: true }) to keep tests modular, fast, and reliable.


---

*This standards index was automatically generated from deployed standard versions.*