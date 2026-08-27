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
runs after it. CI runs it as two parallel legs of one matrix job — once against
the CLI this commit builds (`workspace`) and once against the CLI already
published on the registry (`registry`, which guards the API against breaking the
versions users run) — on an 8-core runner (`ACTION_RUNNER_TAG_8_CORES`) rather
than the pipeline's default 4.

Two properties of the suite's design drive its cost:

- **Setup runs per test, not per suite.** `jest-stage` re-runs the
  `describeWithUserSignedUp` setup before every `it`, so each test pays a fresh
  signup, signin, API-key generation and space lookup — plus whatever the
  suite's own `beforeEach` adds (a git repo, a package, an `install` run). A
  suite with 62 one-assertion tests pays that 62 times.
- **Wall clock is bounded by the longest single suite.** Jest spreads suites
  over workers but never splits one. On the 8-core runner `install.spec.ts`
  alone accounts for the entire run (floor ≈ wall in every measurement), so
  splitting it is the prerequisite for any extra capacity paying off. Perfect
  packing would still stop at `serial / workers` ≈ 44s.

### What was measured, so the next change starts from facts

Measured on CI hardware with a benchmark harness (removed once it had answered;
see PR #443 for the runs and the raw numbers):

| Change                                                | Effect                                                         | Verdict                                                                                       |
| ----------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 4 vCPU / 3 workers → 8 vCPU / 6 workers               | −46 % (105s → 55s)                                             | **adopted**                                                                                   |
| Running the two CLI legs in parallel                  | job 6:26 → 2:38                                                | **adopted**                                                                                   |
| Whole stack → `backend` alone, reached directly       | −10 to −14 % at 8 cores                                        | rejected: the suite would stop exercising nginx and the Vite proxy that real clients traverse |
| bcrypt cost factor 10 → 4                             | −23s serial, ≈ −5s wall (−9 %)                                 | rejected: not worth weakening a production password hash                                      |
| One shared `NODE_COMPILE_CACHE` across the CLI spawns | −14 % per spawn in isolation, **no wall-clock win under load** | rejected: see below                                                                           |
| Dropping `frontend`/`nginx` from stack startup        | −4s, i.e. nothing                                              | the critical path is `install-dependencies` and the migrations                                |
| A bigger runner than 8 cores                          | nothing                                                        | floor already equals wall                                                                     |

**Where a test's time actually goes.** One full `install.spec.ts` test costs
~580ms on the 8-core runner: `cliInstall` 467ms, `signup` 49ms, `signin` 44ms,
and 20ms for everything else (git repo 8ms, package 6ms, API key 4ms, space
2ms). Of the 467ms, **413ms is launching the CLI at all** — a `--version` run,
which makes no API call and writes nothing — leaving 53ms for the command's own
work. Across 287 tests that is roughly **120s of the ~305s serial cost spent on
process startup.** Reducing the _number_ of CLI spawns therefore beats anything
that makes the API faster; `install.spec.ts` runs `install` once per `it`, and
sharing one run across the assertions of a `describe` would remove tens of
seconds at the cost of the one-assertion-per-test style.

**The compile cache, and why the negative result is worth keeping.**
`NODE_COMPILE_CACHE` reuses V8 bytecode across processes, which should be
exactly right for the same bundle compiled 287 times — and in isolation it is:
413ms → 354ms per spawn, −14 %, reproduced twice to within 2ms. Run as A/B arms
inside a single benchmark run it did not survive: the two stack shapes
disagreed in sign (−2.3s and **+5.7s**), both cached arms did _more_ serial work
than their controls, and the two cached arms landed within 0.2s of each other
despite their controls sitting 7.8s apart — consistent with the cache imposing a
floor of its own, plausibly contention between six workers over one directory.
**The transferable lesson is about method:** a per-spawn measurement taken
sequentially and unloaded does not predict suite behaviour under worker
contention, however cleanly it reproduces. If revisited, try one cache directory
_per Jest worker_ (keyed on `JEST_WORKER_ID`), which needs a `runCli` change and
a fresh A/B — not the shared directory measured here.

### Measuring a change

`nx test cli-e2e-tests --skip-nx-cache --json --outputFile=<file>` gives Jest's
per-suite timings. Three numbers are worth deriving from it: the sum of the suite
durations (the work to spread over the workers), the longest single suite (the
hard lower bound on wall clock — when it equals wall clock, extra workers buy
nothing until that file is split), and suite duration ÷ test count (the cost of
one setup-and-act cycle, since every `it` re-runs the whole setup).

One caveat on those timings: **jest-circus starts a test's clock at `test_start`,
before its `beforeEach` hooks.** Hook time is therefore already inside each
test's own duration, and Jest's JSON cannot separate the two — which is why the
per-test attribution above had to be produced by replaying the fixture sequence
directly rather than read out of Jest.

**Measure a candidate as an A/B in one run, on one machine.** The suite step on
the `workspace` leg measured 54, 57, 56, 54, 59, 54, 57 and 55 seconds across
eight successive commits of one branch: a 5s spread makes any effect smaller than
that unmeasurable by comparing commits. That spread is exactly what made the
compile cache look like a win.
