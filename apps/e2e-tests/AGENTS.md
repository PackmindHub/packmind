<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

## Standard: [E2E] Page object

Define PageObjects for E2E tests in Playwright using regular expressions for expectedUrl to ensure safer and more reliable URL matching. :
* Use regExp for `expectedUrl` to ensure safer matching (better than the simili-glob of Playwright)

Full standard is available here for further request: [[E2E] Page object](.packmind/standards/e2e-page-object.md)

## Standard: [E2E] Writing E2E tests

Create non-essential test data via the API in end-to-end test suites to keep scenarios focused, realistic, and maintainable. :
* Data which are not relevant to the test itself should be created using API

Full standard is available here for further request: [[E2E] Writing E2E tests](.packmind/standards/e2e-writing-e2e-tests.md)
<!-- end: Packmind standards -->