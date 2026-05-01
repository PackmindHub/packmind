# integration-tests

End-to-end-ish suites that wire up multiple hexagons against a shared
`TestApp` and exercise cross-domain flows.

## Choosing a backend

`createIntegrationTestFixture(entities, options?)` accepts a `backend` option:

| Backend       | When to use                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `'pg-mem'`    | Default. In-memory Postgres emulation. Fast, no Docker required.                                                          |
| `'container'` | Real Postgres via Testcontainers. Use for JSONB, FTS, advisory locks, real migrations, anything pg-mem doesn't implement. |

```ts
const fixture = createIntegrationTestFixture(schemas, { backend: 'container' });
// or, equivalently:
const fixture = createContainerIntegrationTestFixture(schemas);
```

Container-backed specs need a reachable Docker daemon. Guard with a runtime
check so they skip cleanly when Docker is absent — see
`src/container-fixture.spec.ts` for the pattern.

The shared `testTimeout` is set to 60s in `jest.config.ts` to absorb container
cold-start; pg-mem-backed tests run well under that.

## Running

```sh
nx test integration-tests
```
