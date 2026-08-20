---
applyTo: '**'
---
# Standard: [E2E] Writing E2E tests

Writing proper E2E tests with our stack. Each feature we add should have its own spec file. :
* Always use the fixtures (testWithApi, testWithUser...) instead of the default `test` of Playwright
* Data which are not relevant to the test itself should be created using API
* Specify "testWithApi.use({ underFeatureFlag: true });" in the test file is the tested feature is under a feature flag.

Full standard is available here for further request: [[E2E] Writing E2E tests](../../.packmind/standards/e2e-writing-e2e-tests.md)