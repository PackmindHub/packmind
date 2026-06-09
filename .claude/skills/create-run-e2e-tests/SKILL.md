---
name: 'create-run-e2e-tests'
description: 'Guide for writing and running new Playwright end-to-end tests in the `apps/e2e-tests/` directory of the Packmind monorepo. Use this skill whenever you add or modify a spec that drives the real frontend and API — for example testing a user flow, a new page/route, a feature behind a flag, or a UI behavior end-to-end. Triggers on "write an e2e test", "add a Playwright test", "test this flow end-to-end", "cover this page with an e2e", "e2e for the frontend", or any work that lands a `*.spec.ts` under apps/e2e-tests/src/. Prefer this over hand-rolling raw Playwright `test()` calls — the codebase has mandatory fixtures and a Page Object Model you must follow.'
---

# Authoring Packmind E2E Tests

## Overview

`apps/e2e-tests/` runs Playwright against the **real** frontend (`http://localhost:4200`) and API. Tests drive the browser through a **Page Object Model** and seed irrelevant setup data through the **API**, not the UI. The dev stack must be running first (see `michel-run-local-dev-stack`).

Two rules dominate everything here, and both come from the project's `.packmind` standards:

1. **Never use Playwright's raw `test`.** Always use one of the project fixtures. They handle user creation, sign-up, and API-key setup so each test starts from a clean, authenticated state.
2. **Drive the UI through Page Objects, never raw selectors in specs.** A spec should read like a user story; selectors live inside page objects so a markup change breaks one file, not twenty tests.

## Where files go

| File type | Location | Naming |
|-----------|----------|--------|
| Spec | `src/features/<area>/` | `<Feature>.spec.ts` — one spec per feature |
| Page object interface | `src/domain/pages/index.ts` | `IXxxPage` |
| Page object impl | `src/infra/pages/` | `XxxPage.ts` |
| API gateway type | `src/domain/api/IPackmindApi.ts` | `Gateway<IXxxUseCase>` |
| API gateway impl | `src/infra/api/PackmindApi.ts` | — |
| API data factory | `src/domain/apiDataFactories/` | `apiXxxFactory.ts` |

This mirrors the hexagonal split used across the repo: `domain/` holds interfaces, `infra/` holds implementations.

## Choosing a fixture

The three fixtures form a chain — each extends the previous and adds one capability. Pick the **lowest** one that gives you what the test needs, so you don't pay for setup you won't use.

| Fixture | Provides | Use when |
|---------|----------|----------|
| `testWithUserData` | `userData` (email/password), `page` | Testing sign-up / activation / trial itself — i.e. flows that run *before* a session exists. You drive the `PageFactory` yourself. |
| `testWithUserSignedUp` | everything above + `dashboardPage` (already signed in) | Testing in-app UI where you don't need to seed API data. |
| `testWithApi` | everything above + `packmindApi` | You must seed standards/packages/skills/etc. before exercising the UI. |

All three live in `src/fixtures/packmindTest.ts`. Import the one you need:

```typescript
import { testWithApi } from '../../fixtures/packmindTest';
```

### Example — UI-only test

```typescript
import { testWithUserSignedUp } from '../../fixtures/packmindTest';
import { expect } from '@playwright/test';

testWithUserSignedUp('user sees an empty standards list', async ({ dashboardPage }) => {
  const standardsPage = await dashboardPage.openStandards();

  // eslint-disable-next-line playwright/no-standalone-expect
  expect(await standardsPage.hasNoStandards()).toBe(true);
});
```

### Example — seed via API, assert via UI

Seed everything *not under test* through `packmindApi` (it's faster and less brittle than clicking through setup), then exercise the actual feature in the browser:

```typescript
import { testWithApi } from '../../fixtures/packmindTest';
import { apiStandardFactory } from '../../domain/apiDataFactories/apiStandardFactory';
import { expect } from '@playwright/test';

testWithApi.describe('packages page', () => {
  testWithApi('lists a standard added to a package', async ({ packmindApi, dashboardPage }) => {
    const standard = await apiStandardFactory(packmindApi);
    // ...seed package referencing standard.id...

    const packagesPage = await dashboardPage.openPackages();
    const packagePage = await packagesPage.openPackage('My package');
    const standards = await packagePage.listStandardsInPackage();

    // eslint-disable-next-line playwright/no-standalone-expect
    expect(standards).toEqual([{ name: standard.name }]);
  });
});
```

> The `eslint-disable playwright/no-standalone-expect` line is required: the lint rule can't tell that a fixture-extended `testWithApi(...)` callback is a real test body. Add it on any `expect` that ESLint flags.

## Writing a Page Object

A page object is the typed API a spec uses to talk to one route. Adding one is four mechanical steps — keep them in sync or TypeScript will complain.

**1. Declare the interface** in `src/domain/pages/index.ts`. In-app pages extend `IPackmindAppPage` (gives `openStandards`, `openSettings`, etc. for free); pre-login pages extend `IPackmindPage`.

```typescript
export interface IBillingPage extends IPackmindAppPage {
  listInvoices(): Promise<{ date: string; amount: string }[]>;
}
```

**2. Implement it** in `src/infra/pages/BillingPage.ts`, extending the matching abstract base, and define `expectedUrl()` as a **RegExp** (the project standard — Playwright's glob matching is too loose):

```typescript
import { IBillingPage } from '../../domain/pages';
import { AbstractPackmindAppPage } from './AbstractPackmindAppPage';

export class BillingPage extends AbstractPackmindAppPage implements IBillingPage {
  async listInvoices(): Promise<{ date: string; amount: string }[]> {
    await this.page.locator('table tbody tr').first().waitFor();
    // ...read rows...
  }

  expectedUrl(): RegExp {
    return /.*\/billing$/;
  }
}
```

**3. Register it in the factory** — add a getter to `IPageFactory` and `PageFactory`. Navigation methods that land on this page return the page object, so specs chain naturally (`dashboardPage.openBilling()` → `IBillingPage`).

**4. Prefer `data-testid` over text/role selectors** for app chrome that's likely to be reworded. The codebase exports test-id enums from `@packmind/frontend` (e.g. `SidebarNavigationDataTestId`) — reuse them.

### Why navigation returns a page object

After any navigation, the factory calls `waitForLoaded()` (which awaits `expectedUrl`) before handing back the typed page. That's the project's `this.pageFactory()`-after-navigation rule: it guarantees the URL actually changed before the next interaction runs, killing a whole class of race conditions. Never `page.goto` + interact directly in a spec — go through the factory.

## Seeding data through the API

When a test needs a resource that already exists in the product, create it via the API rather than clicking through the UI. Add the capability bottom-up:

1. Add `myThing: Gateway<ICreateMyThingUseCase>;` to `IPackmindApi` (`src/domain/api/IPackmindApi.ts`). All gateway methods are typed with `Gateway<IXxxUseCase>` from `@packmind/types`.
2. Implement it in `PackmindApi` (`src/infra/api/PackmindApi.ts`) using the private `post`/`get` helpers — they inject the auth header and assert the status code.
3. Wrap it in an `apiXxxFactory` under `src/domain/apiDataFactories/`, reusing the shared `@packmind/<domain>/test` factory for default field values (see `apiStandardFactory.ts` / `apiPackageFactory.ts` for the shape).

This keeps specs declarative: `const standard = await apiStandardFactory(packmindApi)` instead of a paragraph of POST plumbing.

## Feature flags

Before writing, ask: **is the feature under test gated by a feature flag?**

If yes, the test user must have a `@packmind.com` email so the flag resolves to on. Flip the fixture option at the top of the file, before any `describe`/test:

```typescript
testWithApi.use({ underFeatureFlag: true });
```

Without it the fixture creates an `@example.com` user, the flag stays off, and the feature is invisible — the test fails for the wrong reason. (Implementation: see the `underFeatureFlag` option in `packmindTest.ts`.)

## Assertion style

- Split distinct expectations into separate tests or `describe` blocks rather than one mega-test — a failure name then tells you exactly what broke.
- Read state through a page-object method (`listInvoices()`, `listStandards()`) and assert on the returned plain object. Don't reach into the DOM from the spec.
- For multi-step scenarios (sign up → create → verify), nest `describe` blocks with their own `beforeEach`, each building on the parent's state. See `CliInstallDistribution.spec.ts` for the pattern.

## Running the tests

There are two ways to run, and they share the same entry point — `npm run e2e` (i.e. `npx playwright test`). Never run the suite through Nx; it isn't wired for it.

### Local iteration — fast feedback while writing a spec

Bring the stack up first (`michel-run-local-dev-stack`) so `localhost:4200` serves the frontend. Then, **from `apps/e2e-tests/`**:

```bash
npm run e2e                              # all specs (BASE_URL defaults to http://localhost:4200)
npx playwright test <Feature>.spec.ts    # one file
npx playwright test --headed             # watch it run
npx playwright test --debug              # step through with the inspector
npx playwright show-report               # open the last HTML report
```

### Full / CI run — containerized, the canonical way

CI runs the suite inside the `run-e2e-tests` Docker Compose service (Playwright image), whose entrypoint is the same `npm run e2e` but with `BASE_URL=http://frontend:4200`. It lives behind the `e2e` profile, so it only starts when you ask for it. Launch it, then block on its exit code with the helper script — this is what CI does and what keeps the two consistent:

```bash
# From the repo root, with PACKMIND_EDITION=oss already exported
docker compose --profile=e2e up -d run-e2e-tests
./scripts/wait-for-e2e-tests.sh          # waits for the container, returns its exit code
```

`wait-for-e2e-tests.sh` matches the container by the `run-e2e-tests` name pattern, waits for it to finish, prints its logs, and exits with the container's code — so a non-zero exit means a failing suite. Reports land in `apps/e2e-tests/playwright-report/` and `apps/e2e-tests/test-results/` via the volume mount, exactly as in local runs.

Use local iteration while authoring a spec; use the containerized path to reproduce a CI result or run the whole suite the way the pipeline does.

## Checklist before you call it done

- [ ] Spec uses a `testWith*` fixture, not raw `test`.
- [ ] No raw selectors in the spec — all interaction goes through page objects.
- [ ] New page object: interface in `domain/pages`, impl in `infra/pages`, registered in `PageFactory` + `IPageFactory`, `expectedUrl()` is a RegExp.
- [ ] Setup data not under test is seeded via `packmindApi` / an `apiXxxFactory`.
- [ ] `testWithApi.use({ underFeatureFlag: true })` added iff the feature is flagged.
- [ ] `npx playwright test <file>` passes locally against a running stack.
- [ ] `./node_modules/.bin/nx lint e2e-tests` is clean.
