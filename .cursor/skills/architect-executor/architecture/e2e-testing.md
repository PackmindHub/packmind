# E2E Testing — Page Objects & Test Writing

## Fixtures

Always use the project's custom fixtures — never the default Playwright `test`:

- `testWithApi` — for tests that use the API to set up data
- `testWithUser` — for tests that require an authenticated user

```typescript
testWithApi.describe('My feature', () => {
  testWithApi('creates a new distribution', async ({ packmindApi, dashboardPage }) => {
    // test body
  })
})
```

## Test Data Setup

Create data that is **not relevant to the test itself** using API calls — not through the UI:

```typescript
beforeEach(async ({ packmindApi }) => {
  standard = await apiStandardFactory(packmindApi)
  defaultPackage = await apiPackageFactory(packmindApi, { standardIds: [standard.id] })
})
```

## Page Objects

- Every frontend route must have a corresponding Page object
- Use `regExp` for `expectedUrl` — safer than Playwright's glob matching
- Always call `this.pageFactory()` after navigating to a new page to ensure proper typing

```typescript
class StandardsPage extends BasePage {
  expectedUrl = /\/standards/
  async openStandard(name: string) {
    await this.page.getByText(name).click()
    return this.pageFactory(StandardDetailPage)
  }
}
```

## Test Organization

- Each feature gets its own spec file
- Tests within a suite can share setup via `beforeEach`
- Tests can be modularized into focused scenarios even within the same suite
