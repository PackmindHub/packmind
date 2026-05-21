---
name: '[E2E] Writing E2E tests'
alwaysApply: true
description: 'Standardize Playwright E2E specs by creating one spec file per feature, using fixtures like testWithApi/testWithUser with API factories for irrelevant setup data and enabling feature flags via testWithApi.use({ underFeatureFlag: true }) to keep tests modular, fast, and reliable.'
---

# Standard: [E2E] Writing E2E tests

Standardize Playwright E2E specs by creating one spec file per feature, using fixtures like testWithApi/testWithUser with API factories for irrelevant setup data and enabling feature flags via testWithApi.use({ underFeatureFlag: true }) to keep tests modular, fast, and reliable. :
* Always use the fixtures (testWithApi, testWithUser...) instead of the default `test` of Playwright
* Data which are not relevant to the test itself should be created using API
* Specify "testWithApi.use({ underFeatureFlag: true });" in the test file is the tested feature is under a feature flag.

Full standard is available here for further request: [[E2E] Writing E2E tests](../../../.packmind/standards/e2e-writing-e2e-tests.md)