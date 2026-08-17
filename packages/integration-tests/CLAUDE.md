# Integration Tests Package

Cross-domain test suites that exercise several hexas together through a real `HexaRegistry`, rather
than mocking at the port boundary.

This file covers the **mechanics**. The structural conventions for writing these specs are a
Packmind standard — `./.claude/rules/packmind/standard-integration-tests-structure-and-patterns.md`,
in **this package's** rules directory, not the root one — so follow that for test shape and naming.

## Running them

The Nx project is named **`@packmind/integration-tests`**, not `integration-tests`.

**No Docker, database or Redis is needed.** The environment is faked in-process:

- **Postgres** → `pg-mem`, via `makeTestDatasource` from `@packmind/test-utils`.
- **Redis / BullMQ** → `src/test-setup.ts` mocks `queueFactory` with a synchronous `SyncJob`. Jobs
  run **inline inside `addJob`**, so a use case that enqueues work has already completed that work by
  the time the call returns. Do not add waits or polling for job completion.
- **`Configuration.getConfig`** → mocked to resolve `null` for every key except `ENCRYPTION_KEY`.
  A feature that reads new config sees `null` here; extend that mock rather than reaching for a real
  env var.
- **`SSEEventPublisher`** → every `publish*` method is a resolved `jest.fn()`.

## The invariant that breaks every spec at once

`src/helpers/makeIntegrationTestDataSource.ts` builds `integrationTestSchemas` by concatenating each
domain's schema barrel:

```ts
export const integrationTestSchemas = [
  ...accountsSchemas, ...commandsSchemas, ...standardsSchemas, ...spacesSchemas,
  ...gitSchemas, ...deploymentsSchemas, ...skillsSchemas,
];
```

**Adding a schema to a domain package is not enough — it must be added to that barrel too.** A
missing entry surfaces as a "relation does not exist" failure across unrelated specs, not as a
targeted error.

## Helpers to reuse

| Helper | Use |
| --- | --- |
| `helpers/integrationTest.ts` | `integrationTest` / `integrationTestWithUser` wrappers; give the `getContext` accessor |
| `helpers/TestApp.ts` | reach a domain through `testContext.testApp.<domain>Hexa.getAdapter()` |
| `helpers/createIntegrationTestFixture.ts` | schema created once per file, tables truncated between tests |
| `helpers/DataFactory.ts` / `DataQuery.ts` | seed and read fixture data |
| `helpers/StubStandardsListener.ts` | assert standards domain events without a real listener |

`jest.config.ts` sets a 30s timeout and `maxWorkers: 4` — each spec file gets its own database
fixture, so files are safe to parallelise but tests within a file share state.

Note `src/coding-agents-deployments/` is where each coding agent's emitted file layout is asserted;
that is the home for those tests, not `packages/coding-agent`.

Shared package conventions (env tags, layout, `/test` subpath, branded IDs): [../CLAUDE.md](../CLAUDE.md)
