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
| `skipWhenRoot` | skip specs that cannot run as `root` (filesystem-permission tests) |
| `src/repository/` | shared repository-test helpers |

## Mocking an interface

For a type with no class to walk — a port, a service reached through its type, anything structural —
use `mock<T>()` from **jest-mock-extended** (a root devDependency), not an object literal cast with
`as unknown as jest.Mocked<T>`:

```ts
import { mock } from 'jest-mock-extended';

const gitRepo = mock<IGitRepo>();
gitRepo.getFileOnRepo.mockResolvedValue({ sha, content }); // checked against IGitRepo
```

The cast is what we are avoiding: it switches off the structural check the spec type check exists
for. Members the mock omits are invisible until the test blows up at runtime, and a value stubbed
inside the literal (`findById: jest.fn().mockResolvedValue(…)`) is never compared to the contract,
because a bare `jest.fn()` is typed `any`. `mock<T>()` answers every member with a `jest.fn()`, so
the mock is complete by construction, and it returns `MockProxy<T> & T`, which assigns to a
`jest.Mocked<T>` variable — reaching for a member the interface does not declare is a compile error.

Members can be seeded up front, and an implementation is checked against the signature where a
`jest.fn()` is not:

```ts
const accounts = mock<IAccountsPort>({ getUserById: async () => user });
```

A complete mock is a quiet one: a member nobody stubbed answers `undefined`, so the day the code
under test starts calling one this spec never set up, the call goes through and the test may still
pass — where a hand-written partial mock would have thrown `is not a function`. Pass a
`fallbackMockImplementation` where that silence would hide something:

```ts
const gitRepo = mock<IGitRepo>(
  {},
  { fallbackMockImplementation: () => { throw new Error('not stubbed'); } },
);
```

Two limits worth knowing. A **data member** is answered with a `jest.fn()` too — `mock<AxiosInstance>().defaults`
is a function standing where a value belongs, and nothing catches it at compile time — so a type
whose shape is mostly data is better mocked by hand (see the axios literals in `packages/git`). And
an axios instance is callable, which a mock proxy is not.

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
