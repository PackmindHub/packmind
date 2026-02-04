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
