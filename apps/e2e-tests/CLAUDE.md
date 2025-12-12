<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

## Standard: [E2E] Page object

Define Playwright E2E PageObjects for each frontend route using regexp-based expectedUrl matching and mandatory this.pageFactory() after navigation to ensure safer URL validation and proper typing. :
* Always add this.pageFactory() after navigating to ensure proper typing
* Each route in the frontend should correspond to a Page object
* Use regExp for `expectedUrl` to ensure safer matching (better than the simili-glob of Playwright)

Full standard is available here for further request: [[E2E] Page object](.packmind/standards/e2e-page-object.md)

## Standard: [E2E] Writing E2E tests

Define modular Playwright E2E test specs using shared fixtures (testWithApi, testWithUser) and API-based data factories to isolate feature behavior, reduce duplication, and improve test reliability. :
* Always use the fixtures (testWithApi, testWithUser...) instead of the default `test` of Playwright
* Data which are not relevant to the test itself should be created using API

Full standard is available here for further request: [[E2E] Writing E2E tests](.packmind/standards/e2e-writing-e2e-tests.md)
<!-- end: Packmind standards -->