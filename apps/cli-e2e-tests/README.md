# CLI E2E Tests

End-to-end tests for the Packmind CLI in real-like conditions.

## Prerequisites

Before running these tests, you need:

1. **Built CLI**: The CLI must be built first

   ```bash
   nx build packmind-cli
   ```

2. **Clean Environment**: Ensure `PACKMIND_API_KEY` is not set in your `.env` file or shell environment, as tests need to control authentication state

3. **Running API** (for authenticated tests only): The API server must be running. By default, tests expect it at `http://localhost:4200`, but you can override this with the `PACKMIND_INSTANCE_URL` environment variable:

   ```bash
   docker compose up
   ```

   ```bash
   # Optional: Override the default Packmind instance URL
   export PACKMIND_INSTANCE_URL=http://localhost:3000
   ```

   **Note**: Basic tests like `whoami-basic.spec.ts` don't require the API and can run standalone.

## Running Tests

Run all CLI E2E tests:

```bash
nx test cli-e2e-tests
```

Run tests in watch mode:

```bash
nx test cli-e2e-tests --watch
```

Run a specific test file:

```bash
nx test cli-e2e-tests --testFile=whoami.spec.ts
```

## Test Structure

Tests use helper functions that mirror the integration test patterns:

### `describeWithUserSignedUp()`

Creates a test suite with a signed-up user and API key:

```typescript
describeWithUserSignedUp('my command', (getContext) => {
  let apiKey: string;

  beforeEach(async () => {
    const context = await getContext();
    apiKey = context.apiKey;
  });

  it('does something', async () => {
    const result = await runCli('my-command', { apiKey });
    expect(result.returnCode).toBe(0);
  });
});
```

### `runCli()`

Executes the CLI with optional API key:

```typescript
const result = await runCli('whoami', { apiKey: 'my-key' });

console.log(result.returnCode); // Exit code
console.log(result.stdout); // Standard output
console.log(result.stderr); // Standard error
```

## Architecture

- **Real CLI Execution**: Tests run the actual CLI binary (`dist/apps/cli/main.cjs`)
- **Real API Calls**: User setup is done via HTTP calls to the API
- **Isolated Tests**: Each test suite creates its own user account
- **Jest Stage**: Uses `jest-stage` for context management like integration tests

## Writing Tests

1. Use `describeWithUserSignedUp()` for authenticated commands
2. Use `runCli()` to execute CLI commands
3. Check `returnCode`, `stdout`, and `stderr` in assertions
4. Each test suite gets a fresh user account with a unique email

## Performance

This suite is the longest job of the build stage, so it gates everything that
runs after it. Two properties of its design drive that cost:

- **Setup runs per test, not per suite.** `jest-stage` re-runs the
  `describeWithUserSignedUp` setup before every `it`, so each test pays a fresh
  signup, signin, API-key generation and space lookup — plus whatever the
  suite's own `beforeEach` adds (a git repo, a package, an `install` run).
  A suite with 62 one-assertion tests pays that 62 times.
- **Wall clock is bounded by the longest single suite.** Jest spreads suites
  over workers but never splits one, so no amount of extra workers takes the
  run below the duration of the slowest file.

### Benchmarking a change

`scripts/cli-e2e-benchmark-report.mjs` turns Jest's JSON report into the
metrics that make those two properties visible:

```bash
nx test cli-e2e-tests --skip-nx-cache --json --outputFile=/tmp/baseline.workers-3.json
node scripts/cli-e2e-benchmark-report.mjs report /tmp/baseline.workers-3.json
```

| Metric                 | Reading                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `wall`                 | what CI waits for                                                                                             |
| `serial`               | Σ suite durations — the work to spread over the workers                                                       |
| `floor`                | longest single suite — the hard lower bound on `wall`                                                         |
| `hooks` vs test bodies | setup cost versus the assertions themselves                                                                   |
| worker efficiency      | `serial / (wall × workers)`; ~1.0 means the workers are saturated and only less work or more workers can help |

The label and worker count are read back out of the file name
(`<label>.workers-<n>.json`), because Jest's JSON records neither. Pass several
reports to `compare` to get one row each:

```bash
node scripts/cli-e2e-benchmark-report.mjs compare /tmp/baseline.workers-3.json /tmp/api-only.workers-6.json
```

To measure on CI hardware, run the **CLI E2E Benchmark** workflow
(`.github/workflows/cli-e2e-benchmark.yml`). It takes a runner label, a list of
variants and a worker count, runs each variant against its own stack, and posts
the per-variant tables and the comparison to the job summary.

`docker-compose.cli-e2e.yml` is the overlay its `api-only` variants use: it
publishes the API port so `PACKMIND_INSTANCE_URL` can point straight at the API,
which lets the job start `backend` alone instead of the whole stack — no
frontend dev server, no nginx, and no Vite proxy hop on every request.
