# E2E Tests Application

Playwright end-to-end tests driving the real frontend and API.

Everything about writing and running these tests is owned elsewhere — do not look for it here:

- **How to write and run a spec** (where files go, choosing a fixture, writing a Page Object, seeding
  through the API, feature flags, the commands): the **`create-run-e2e-tests`** skill.
- **Mandatory conventions**: the two standards in `apps/e2e-tests/.claude/rules/packmind/` — *[E2E] Page object* and
  *[E2E] Writing E2E tests*. Both are `alwaysApply: true`, so they are already in context.

Only `chromium` is enabled in `playwright.config.ts`; the Firefox, WebKit, mobile and branded-browser
projects are commented out. There are no snapshot assertions in this suite.
