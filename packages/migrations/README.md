# migrations

TypeORM migrations for the Packmind schema. Production migrations are run via
`datasourceDocker.ts` against the deployment database.

## Running tests

```sh
nx test migrations
```

`src/migrations/migrations.spec.ts` boots a real PostgreSQL 17 container via
Testcontainers and runs every migration end-to-end, asserting idempotency on a
second pass. It catches divergences that `pg-mem`-backed tests cannot, since
those tests use `synchronize()` from entity metadata and never execute the
migration files. The spec skips automatically when no Docker daemon is
available.
