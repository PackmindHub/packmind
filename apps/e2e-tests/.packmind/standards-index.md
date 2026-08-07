# Packmind Standards Index

This standards index contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards

- [[E2E] Page object](./standards/e2e-page-object.md) : Write proper PageObjects for our E2E tests
- [[E2E] Writing E2E tests](./standards/e2e-writing-e2e-tests.md) : Writing proper E2E tests with our stack. Each feature we add should have its own spec file.

\
Although we're talking about E2E tests, we can still keep them modularized, example:

```ts
testWithApi.describe('My super feature', () => {
  let standard: Standard;
  let defaultPackage: Package;
  
  beforeEach(({ { packmindApi }) => {
    // Create test data using APIs
    standard = await apiStandardFactory(packmindApi);
    defaultPackage = await apiPackageFactory(packmindApi, {
      standardIds: [standard.id],
    });

    // Trigger the feature
    const packagesPage = await dashboardPage.openPackages();
    await packagesPage.deploy(defaultPackage.name);
  })

  testWithApi('it creates a new distribution', async () => {
    // CHeck the package distribution
  });

  testWithApi('it commits data on Git', async () => {
    // Check proper GIT integration
  })
})
```


---

*This standards index was automatically generated from deployed standard versions.*