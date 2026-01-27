# E2E Tests Application

Playwright end-to-end tests for Packmind frontend and API, using Page Object Model.

## Architecture

- **Framework**: Playwright 1.56 for browser automation
- **Pattern**: Page Object Model for maintainable test organization
- **Test Organization**: Tests organized by user flow and feature area
- **Fixtures**: Custom fixtures for API setup and user authentication
- **Data Management**: Test factories for consistent test data creation

### Page Object Model

- Page objects in `src/pages/` represent application pages/routes
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

## Key Patterns

### Custom Fixtures

- **testWithApi**: Provides authenticated API client for test setup
- **testWithUser**: Creates and authenticates a test user automatically
- Located in `src/fixtures/` directory
- Extend base Playwright test with custom fixtures

### Page Objects per Route

- One page object per major route or feature area
- Page objects expose methods for user interactions (click, fill, etc.)
- Page objects handle waiting for elements and navigation
- Example structure:
  ```typescript
  export class StandardsListPage {
    constructor(private page: Page) {}
    async navigateTo() { ... }
    async clickCreateButton() { ... }
    async getStandardByName(name: string) { ... }
  }
  ```

### Test Data Management

- Use test factories to create consistent test data
- Clean up test data in `afterEach` hooks
- Isolate tests with unique data (e.g., unique space names)

### Authentication Handling

- `testWithUser` fixture handles login flow automatically
- Reuses authentication state across tests in same worker
- Avoids repeated login for performance

## Configuration

- **Config File**: `playwright.config.ts` in root
- **Base URL**: Configured to point to local or staging environment
- **Browsers**: Chromium (default), Firefox, WebKit (configurable)
- **Parallelization**: Configurable worker count
- **Retries**: Configurable retry count for flaky tests

## Testing

- Follow standards in `.claude/rules/packmind/standard-testing-good-practices.md`
- Use descriptive test names (verb-first, no "should")
- One assertion per test when possible
- Use `test.describe()` for grouping related tests

## Test Organization

- **Smoke tests**: Critical user paths (login, create space, etc.)
- **Feature tests**: Specific feature functionality
- **Integration tests**: Multi-step workflows across features

## Related Documentation

- See `.claude/rules/packmind/` for coding standards
- See [Playwright Documentation](https://playwright.dev) for framework details
- See root `CLAUDE.md` for monorepo-wide rules
