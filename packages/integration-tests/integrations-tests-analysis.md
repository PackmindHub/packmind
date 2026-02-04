# Integration Tests Performance Analysis

**Date:** 2026-02-04
**Total Tests:** 560
**Total Execution Time:** 57.4 seconds (wall clock)

## Executive Summary

The integration test suite runs 560 tests across 14 test files. The current optimization shares the database datasource initialization at the file level (`beforeAll`) while creating fresh `TestApp` instances per test (`beforeEach`). This provides test isolation while avoiding repeated schema synchronization.

## Performance Metrics

| Metric               | Value            |
| -------------------- | ---------------- |
| Wall clock time      | 57.4s            |
| Cumulative test time | 217.3s           |
| Effective throughput | 9.8 tests/second |
| Average per test     | 388ms            |
| Tests >1000ms        | 44 (75.8s total) |

## Test Files by Execution Time

| Rank | File                                           | Duration  | Tests | Avg/test |
| ---- | ---------------------------------------------- | --------- | ----- | -------- |
| 1    | `webhook-contract.integration.spec.ts`         | **57.4s** | 76    | 755ms    |
| 2    | `package-removal-from-target.spec.ts`          | **23.1s** | 12    | 1923ms   |
| 3    | `target-specific-deployment.spec.ts`           | 21.8s     | 95    | 229ms    |
| 4    | `packages-deployment.spec.ts`                  | 21.5s     | 32    | 673ms    |
| 5    | `copilot-deployment.spec.ts`                   | 21.4s     | 103   | 208ms    |
| 6    | `claude-deployment.spec.ts`                    | 16.1s     | 61    | 264ms    |
| 7    | `packmind-deployment.spec.ts`                  | **15.8s** | 12    | 1313ms   |
| 8    | `cursor-deployment.spec.ts`                    | 12.0s     | 47    | 255ms    |
| 9    | `continue-deployment.spec.ts`                  | 10.0s     | 43    | 234ms    |
| 10   | `junie-deployment.spec.ts`                     | 7.7s      | 38    | 203ms    |
| 11   | `add-rule-to-standard.spec.ts`                 | 5.0s      | 22    | 226ms    |
| 12   | `claude-md-cleanup-on-package-removal.spec.ts` | 3.3s      | 8     | 411ms    |
| 13   | `standard-updated-event.spec.ts`               | 1.4s      | 7     | 197ms    |
| 14   | `one-click-onboarding.spec.ts`                 | 0.9s      | 4     | 213ms    |

## Summary by Category

| Category                  | Time   | Files | Tests |
| ------------------------- | ------ | ----- | ----- |
| coding-agents-deployments | 104.8s | 7     | 399   |
| recipes-lifecycle         | 57.4s  | 1     | 76    |
| root-level tests          | 54.3s  | 5     | 81    |
| onboarding                | 0.9s   | 1     | 4     |

## Identified Bottlenecks

### 1. webhook-contract.integration.spec.ts (Critical Path)

**Impact:** 57.4s - determines total wall clock time
**Slow tests:** 23 tests >1s (40.8s total)

**Root causes:**

- Complex webhook flow simulation with async job mocking
- Each test creates: git commit → package distribution → webhook simulation
- GitHub and GitLab tests run sequentially in same file

### 2. package-removal-from-target.spec.ts (Highest avg/test)

**Impact:** 1923ms average per test
**Slow tests:** 10 tests >1s (20.9s total)

**Root causes:**

- Full deployment pipeline setup before each removal test
- Complex artifact distribution and cleanup verification
- Multiple hexas involved in each operation

### 3. packmind-deployment.spec.ts (High overhead)

**Impact:** 1313ms average per test
**Slow tests:** 9 tests >1s (11.9s total)

**Root causes:**

- Full deployment workflow with git operations
- Heavy mocking setup in beforeEach

### 4. TestApp Initialization Overhead

Each test currently initializes a fresh `TestApp` which:

- Creates and registers 13 hexas (AccountsHexa, RecipesHexa, StandardsHexa, etc.)
- Initializes all services and listeners
- Estimated overhead: 50-200ms per test

## Recommendations

### Short-term Optimizations

1. **Split webhook-contract.integration.spec.ts**
   - Separate GitHub and GitLab tests into different files
   - Allows Jest to run them in parallel
   - Expected improvement: ~25-30s reduction in wall clock time

2. **Optimize package-removal tests**
   - Use shared deployment setup where possible
   - Consider lighter fixtures for pure removal logic

3. **Reduce TestApp initialization frequency**
   - Share TestApp at file level where test isolation allows
   - Requires careful event listener management (see Technical Notes)

### Medium-term Optimizations

4. **Profile HexaRegistry initialization**
   - Identify slowest hexas to initialize
   - Consider lazy initialization for hexas not needed in all tests

5. **Parallel test execution tuning**
   - Jest `maxWorkers` configuration
   - Test file distribution optimization

### Long-term Considerations

6. **Test architecture review**
   - Consider unit tests for business logic (faster, isolated)
   - Reserve integration tests for end-to-end flows
   - Current ratio: 560 integration tests may include logic that could be unit tested

## Technical Notes

### Event Listener Considerations

When sharing `TestApp` across tests, event listeners remain subscribed. This is important for tests that rely on domain events (e.g., recipe deletion → `DeploymentsListener` → package update).

Options:

- **Keep listeners active:** Works if tests don't conflict on event handling
- **Re-register listeners:** Call `listener.initialize()` in beforeEach after clearing
- **Fresh TestApp per test:** Current approach, safest but slowest

### Current Fixture Pattern

```typescript
const fixture = createIntegrationTestFixture(schemas);

beforeAll(() => fixture.initialize()); // Datasource + schema once

beforeEach(async () => {
  testApp = new TestApp(fixture.datasource); // Fresh hexas per test
  await testApp.initialize();
  dataFactory = new DataFactory(testApp);
});

afterEach(async () => {
  jest.clearAllMocks();
  await fixture.cleanup(); // Truncate tables
});

afterAll(() => fixture.destroy());
```

## Next Experiments

### Experiment 1: Split Webhook Tests

**Hypothesis:** Splitting webhook tests into GitHub/GitLab files reduces wall clock time by ~50%
**Metrics to track:** Wall clock time, individual file duration

### Experiment 2: Shared TestApp with Listener Re-registration

**Hypothesis:** Sharing TestApp while re-registering listeners reduces per-test overhead by 50-150ms
**Metrics to track:** Average test duration, event-driven test reliability

### Experiment 3: Lazy Hexa Initialization

**Hypothesis:** Lazy-loading unused hexas in TestApp reduces initialization time
**Metrics to track:** TestApp.initialize() duration, per-test overhead

### Experiment 4: Targeted Jest Workers

**Hypothesis:** Increasing maxWorkers and optimizing file sizes improves parallelization
**Metrics to track:** Wall clock time vs CPU utilization

---

## Appendix: Slowest Individual Tests

| Rank | Duration | Test                                                   |
| ---- | -------- | ------------------------------------------------------ |
| 1    | 2485ms   | GitLab webhook - recipe deployed - content differs     |
| 2    | 2464ms   | Package removal - exclusive artifacts - deletes        |
| 3    | 2384ms   | GitLab webhook - recipe deployed - multiple updates    |
| 4    | 2321ms   | Package removal - shared artifacts - no delete         |
| 5    | 2292ms   | Package removal - shared artifacts - deletes exclusive |
| 6    | 2270ms   | GitHub webhook - recipe deployed - content differs     |
| 7    | 2236ms   | GitLab webhook - target path update                    |
| 8    | 2233ms   | GitLab webhook - multiple recipes                      |
| 9    | 2191ms   | Package removal - shared artifacts - updates           |
| 10   | 2156ms   | GitLab webhook - deployment trigger                    |
