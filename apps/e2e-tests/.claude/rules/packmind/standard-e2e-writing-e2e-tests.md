---
name: '[E2E] Writing E2E tests'
alwaysApply: true
description: 'Define modular Playwright E2E test specs using shared fixtures (testWithApi, testWithUser) and API-based data factories to isolate feature behavior, reduce duplication, and improve test reliability.'
---

## Standard: [E2E] Writing E2E tests

Define modular Playwright E2E test specs using shared fixtures (testWithApi, testWithUser) and API-based data factories to isolate feature behavior, reduce duplication, and improve test reliability. :

- Always use the fixtures (testWithApi, testWithUser...) instead of the default `test` of Playwright
- Data which are not relevant to the test itself should be created using API

Full standard is available here for further request: [[E2E] Writing E2E tests](../../../.packmind/standards/e2e-writing-e2e-tests.md)
