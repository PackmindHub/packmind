# [E2E] Writing E2E tests

Writing proper E2E tests with our stack. Each feature we add should have its own spec file.

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

## Rules

* Data which are not relevant to the test itself should be created using API
* Always use the fixtures (testWithApi, testWithUser...) instead of the default `test` of Playwright
