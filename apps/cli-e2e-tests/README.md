# CLI E2E Tests

End-to-end tests for the Packmind CLI in real-like conditions.

## Prerequisites

Before running these tests, you need:

1. **Built CLI**: The CLI must be built first

   ```bash
   nx build packmind-cli
   ```

2. **Clean Environment**: Ensure `PACKMIND_API_KEY_V3` is not set in your `.env` file or shell environment, as tests need to control authentication state

3. **Running API** (for authenticated tests only): The API server must be running at `http://localhost:4200`

   ```bash
   docker compose up
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
