<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

# Standard: [E2E] Page object

Define Playwright E2E PageObjects for each frontend route using regexp-based expectedUrl matching and mandatory this.pageFactory() after navigation to ensure safer URL validation and proper typing. :
* Always add this.pageFactory() after navigating to ensure proper typing
* Each route in the frontend should correspond to a Page object
* Use regExp for `expectedUrl` to ensure safer matching (better than the simili-glob of Playwright)

Full standard is available here for further request: [[E2E] Page object](../../.packmind/standards/e2e-page-object.md)

# Standard: [E2E] Writing E2E tests

Standardize Playwright E2E specs by creating one spec file per feature, using fixtures like testWithApi/testWithUser with API factories for irrelevant setup data and enabling feature flags via testWithApi.use({ underFeatureFlag: true }) to keep tests modular, fast, and reliable. :
* Always use the fixtures (testWithApi, testWithUser...) instead of the default `test` of Playwright
* Data which are not relevant to the test itself should be created using API
* Specify "testWithApi.use({ underFeatureFlag: true });" in the test file is the tested feature is under a feature flag.

Full standard is available here for further request: [[E2E] Writing E2E tests](../../.packmind/standards/e2e-writing-e2e-tests.md)
<!-- end: Packmind standards -->