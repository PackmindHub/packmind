import {
  createLoadSampler,
  emitTiming,
  isTimingEnabled,
  round,
} from './timing';

/**
 * Brackets every test with a timestamped start/end, and samples machine load
 * while the file runs.
 *
 * A setup file's `beforeEach` runs before the spec's own, and its `afterEach`
 * after — so a test that dies in `beforeEach` still gets a `test:start` and a
 * `test:end`, and the gap between them is the hook's real duration. That pair
 * is what identifies which hook was in flight during a stall; the reported
 * per-file totals cannot, because a 227s file says nothing about which of its
 * tests spent the time.
 */
let stopSampler: (() => void) | undefined;

beforeAll(() => {
  stopSampler = createLoadSampler();
});

afterAll(() => {
  stopSampler?.();
  stopSampler = undefined;
});

let testStartedAt: number | undefined;

beforeEach(() => {
  if (!isTimingEnabled()) return;
  testStartedAt = performance.now();
  emitTiming('test:start', { name: expect.getState().currentTestName });
});

afterEach(() => {
  if (!isTimingEnabled()) return;
  emitTiming('test:end', {
    name: expect.getState().currentTestName,
    ms:
      testStartedAt === undefined
        ? null
        : round(performance.now() - testStartedAt),
  });
  testStartedAt = undefined;
});
