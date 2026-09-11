# Test Utils Package

Generic test infrastructure shared by every package. Reach for something here before writing your
own — most of what a new spec needs already exists.

## Division of labour

- **Generic** helpers (datasources, logger stubs, mock instances) live **here**.
- **Entity** factories live in the owning domain package's `test/` folder and are imported as
  `@packmind/<pkg>/test` (e.g. `standardFactory` from `@packmind/standards/test`).

> **`src/factories/standards/`, `git/`, `deployments/` and `commands/` are stale duplicates.** They
> re-declare factories that also exist in the domain packages' `test/` folders (e.g. `standardFactory`
> is byte-identical to the one in `packages/standards/test/`). They are exported from `src/index.ts`;
> almost every spec imports from `@packmind/<pkg>/test` instead, with two known exceptions
> (`apps/frontend/src/domain/deployments/components/{StandardCentricView,CommandCentricView}/*.spec.tsx`).
> Do not add entity factories here, and when you touch one of these, change the `@packmind/<pkg>/test`
> copy: that is the one actually under test.

## What's available

| Export | Use |
| --- | --- |
| `makeTestDatasource(entities)` | in-memory Postgres via **pg-mem** — no Docker, no real database |
| `makeTestDatabase(entities)` | same, but also hands back the pg-mem `db` so you can take restore points |
| `createTestDatasourceFixture(entities)` | schema built once per file, `TRUNCATE ... CASCADE` between tests; much faster than rebuilding per test |
| `Factory<T>` | the type every `*Factory` implements: `(opts?: Partial<T>) => T` |
| `randomIn` | pick a random value from a set, for factory defaults |
| `stubLogger` | fully typed `PackmindLogger` stub |
| `createMockInstance` | typed mock of a whole class |
| `mockPort` | typed mock of an interface — the counterpart for ports, which have no class to walk |
| `skipWhenRoot` | skip specs that cannot run as `root` (filesystem-permission tests) |
| `src/repository/` | shared repository-test helpers |

## Mocking a port

Reach for `mockPort<IPort>()` rather than an object literal cast with
`as unknown as jest.Mocked<IPort>`. The cast switches off the structural check the spec type check
exists for: members the mock omits are invisible until the test blows up at runtime, and a value
stubbed inside the literal (`findById: jest.fn().mockResolvedValue(…)`) is never compared to the
contract, because a bare `jest.fn()` is typed `any`. `mockPort` backs every member with a
`jest.fn()` lazily, so the mock is complete by construction, and stubs are typed:

```ts
const gitRepo = mockPort<IGitRepo>();
gitRepo.getFileOnRepo.mockResolvedValue({ sha, content }); // checked against IGitRepo
```

`createTestDatasourceFixture` is the preferred shape for repository specs: `initialize()` in
`beforeAll`, `cleanup()` in `afterEach`, `destroy()` in `afterAll`. Its own doc comment carries a
worked example.

When every test in a file needs the **same** seeded rows, seed them once in `beforeAll` and call
`snapshot()`. `cleanup()` then rewinds to that seeded state instead of truncating — an O(1) pg-mem
restore — so the seed is paid once per file rather than once per test. Beware that anything built on
top of the datasource (a service, a `TestApp`) is then shared across tests too, so spies on it must
be undone; enable `restoreMocks` in the project's `jest.config.ts` rather than relying on
`jest.clearAllMocks()`.

Test-writing style (naming, assertions, mock cleanup) is covered by
the repository-root `.claude/rules/packmind/standard-backend-tests-redaction.md` — not repeated here.

Shared package conventions (env tags, layout, `/test` subpath, branded IDs): [../CLAUDE.md](../CLAUDE.md)
