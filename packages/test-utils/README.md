# test-utils

Test fixtures, factories, and utilities shared across the monorepo.

## Database fixtures

Two backends are available for tests that need a `DataSource`. Pick based on
what the test exercises.

### `createTestDatasourceFixture` (pg-mem, default)

In-memory PostgreSQL emulation via [pg-mem](https://github.com/oguimbal/pg-mem).
Fast, zero-infra, runs anywhere. Use this for almost everything — repository
unit tests, hexagon tests, anything that just needs CRUD and relational
queries.

```ts
import { createTestDatasourceFixture } from '@packmind/test-utils';

const fixture = createTestDatasourceFixture([SchemaA, SchemaB]);

beforeAll(() => fixture.initialize());
afterEach(() => fixture.cleanup());
afterAll(() => fixture.destroy());
```

### `createContainerTestDatasourceFixture` (Testcontainers, opt-in)

Real PostgreSQL 17 in a Docker container managed by
[Testcontainers](https://node.testcontainers.org/). Same fixture API; the
container is reused across the Jest run and each fixture instance gets its own
schema for parallel-worker isolation.

```ts
import { createContainerTestDatasourceFixture } from '@packmind/test-utils';

const fixture = createContainerTestDatasourceFixture([SchemaA, SchemaB]);

beforeAll(() => fixture.initialize(), 120_000); // bump timeout for cold-start
afterEach(() => fixture.cleanup());
afterAll(() => fixture.destroy());
```

Reach for this when the test exercises something pg-mem doesn't faithfully
implement, such as:

- JSON/JSONB operators (`@>`, `?`, `jsonb_path_query`)
- Full-text search (`tsvector`, `to_tsquery`, `plainto_tsquery`)
- Advisory locks (`pg_advisory_lock`)
- Specialised index types (GIN, partial, expression)
- Triggers and stored procedures
- Real migrations (TypeORM `runMigrations()`, not `synchronize()`)

Specs that depend on Docker should guard with a runtime check so they skip
cleanly on machines without a daemon — see
`packages/test-utils/src/dataSources/containerTestDatasource.spec.ts` for the
pattern.

## Running tests

```sh
nx test test-utils
```

Container-backed specs require Docker; they skip automatically when no daemon
is reachable.
