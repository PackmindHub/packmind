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
- **Isolated Tests**: Each test — not each suite — creates its own user account and temp directories; see Performance below for what that costs
- **Jest Stage**: Uses `jest-stage` for context management like integration tests

## Writing Tests

1. Use `describeWithUserSignedUp()` for authenticated commands
2. Use `runCli()` to execute CLI commands
3. Check `returnCode`, `stdout`, and `stderr` in assertions
4. Each test suite gets a fresh user account with a unique email

## Performance

This suite is the longest job of the build stage, so it gates everything that
runs after it. CI runs it twice — once against the CLI this commit builds
(`workspace`) and once against the CLI already published on the registry
(`registry`, which guards the API against breaking the versions users run) — as
two parallel legs of the same matrix job. Two properties of its design drive
its cost:

- **Setup runs per test, not per suite.** `jest-stage` re-runs the
  `describeWithUserSignedUp` setup before every `it`, so each test pays a fresh
  signup, signin, API-key generation and space lookup — plus whatever the
  suite's own `beforeEach` adds (a git repo, a package, an `install` run).
  A suite with 62 one-assertion tests pays that 62 times.
- **Wall clock is bounded by the longest single suite.** Jest spreads suites
  over workers but never splits one, so no amount of extra workers takes the
  run below the duration of the slowest file. That bound is relative to the
  hardware, not absolute: with less contention the longest file also runs
  faster. Measured on an 8-vCPU runner with 6 workers, `install.spec.ts` alone
  accounts for the entire run — so splitting it is the prerequisite for any
  further capacity paying off.

### Benchmarking a change

`scripts/cli-e2e-benchmark-report.mjs` turns Jest's JSON report into the
metrics that make those two properties visible:

```bash
nx test cli-e2e-tests --skip-nx-cache --json --outputFile=/tmp/baseline.workers-3.json
node scripts/cli-e2e-benchmark-report.mjs report /tmp/baseline.workers-3.json
```

| Metric            | Reading                                                                                                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `wall`            | what CI waits for                                                                                                                                                                                                                                                        |
| `serial`          | Σ suite durations — the work to spread over the workers                                                                                                                                                                                                                  |
| `floor`           | longest single suite — the hard lower bound on `wall`. Flagged **at wall** when it accounts for the whole run, which means extra workers buy nothing until that file is split                                                                                            |
| `per test`        | suite duration ÷ test count. Since every `it` re-runs the whole setup, this is the cost of one setup-and-act cycle — the number to watch when changing how tests get their fixtures                                                                                      |
| `outside tests`   | suite duration − Σ test durations: module load and top-level setup **only**. Not the per-test hook cost — jest-circus starts a test's clock before its `beforeEach` runs, so hook time already sits inside each test's duration, and Jest's JSON cannot separate the two |
| worker efficiency | `serial / (wall × workers)`; ~1.0 means the workers are saturated, and a low value with `floor` at wall means they are idling on the longest file                                                                                                                        |

The label and worker count are read back out of the file name
(`<label>.workers-<n>.json`), because Jest's JSON records neither. Pass several
reports to `compare` to get one row each:

```bash
node scripts/cli-e2e-benchmark-report.mjs compare /tmp/baseline.workers-3.json /tmp/api-only.workers-6.json
```

To measure on CI hardware, run the **CLI E2E Benchmark** workflow
(`.github/workflows/cli-e2e-benchmark.yml`): pick variants from its catalogue,
each of which pins a stack shape, a runner size and a worker count. It runs each
against its own stack and posts the per-variant tables plus a comparison to the
job summary and the step log. Adding the `cli-e2e-benchmark` label to a pull
request runs the default 2×2 against that branch.

`docker-compose.cli-e2e.yml` is the overlay its `api-only` variants use: it
publishes the API port on loopback so `PACKMIND_INSTANCE_URL` can point straight
at the API, which lets the job start `backend` alone — no frontend dev server,
no nginx, and no Vite proxy hop on every request.

What the first sweep measured, so the next change starts from facts rather than
from the same guesses:

| Change                                       | Effect on the suite                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 4 vCPU / 3 workers → 8 vCPU / 6 workers      | **−50 %** (105.5s → 52.4s)                                                                   |
| whole stack → `backend` alone, direct        | 0 % at 4 vCPU, −5 % at 8 vCPU                                                                |
| dropping the frontend and nginx from startup | −4s, i.e. nothing: `install-dependencies` and the migrations are the startup's critical path |
