# E2E Tests Application

Playwright end-to-end tests for Packmind frontend and API, using Page Object Model.

## Architecture

- **Framework**: Playwright 1.56 for browser automation
- **Pattern**: Page Object Model for maintainable test organization
- **Test Organization**: Tests organized by user flow and feature area
- **Fixtures**: Custom fixtures for API setup and user authentication
- **Data Management**: Test factories for consistent test data creation

### Page Object Model

- Page objects in `src/infra/pages/` and `src/domain/pages/` represent application pages/routes
- Each page object encapsulates selectors and interactions
- Tests use page objects to interact with UI, avoiding direct selectors
- Example: `LoginPage`, `StandardsListPage`, `SpaceSettingsPage`

## Technologies

- **Playwright**: v1.56 - Cross-browser testing (Chromium, Firefox, WebKit)
- **TypeScript**: Type-safe page objects and test definitions
- **Custom Fixtures**: `testWithApi`, `testWithUser` for setup/teardown
- **Test Factories**: Shared factories from `packages/test-utils/`

## Main Commands

- Run all E2E tests: `npm run e2e` (NOT via Nx)
- Run specific test file: `npx playwright test <file-name>`
- Run in headed mode: `npx playwright test --headed`
- Run in debug mode: `npx playwright test --debug`
- Show report: `npx playwright show-report`
- Update snapshots: `npx playwright test --update-snapshots`

## Configuration

- **Config File**: `playwright.config.ts` in root
- **Base URL**: Configured to point to local or staging environment
- **Browsers**: Chromium (default), Firefox, WebKit (configurable)
- **Parallelization**: Configurable worker count
- **Retries**: Configurable retry count for flaky tests


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