import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';

// @testing-library/dom gates its fake-timer support on `typeof jest !== 'undefined'`
// (see jestFakeTimersAreEnabled in its helpers.js) and then calls exactly one method:
// jest.advanceTimersByTime. Without this shim `waitFor` polls on real timers while
// Vitest's fake clock is installed, so the poll never fires and the test dies at the
// 5s timeout. Deliberately a one-method shim rather than `globalThis.jest = vi`: a
// stray `jest.fn()` reintroduced into a spec must still fail loudly.
(globalThis as { jest?: unknown }).jest = {
  advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
};

// Automatically cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
});

afterAll(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  vi.clearAllTimers();
  vi.useRealTimers();
});

// Mock winston globally to prevent PackmindLogger instantiation issues in frontend tests
vi.mock('winston', () => {
  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    http: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
    silly: vi.fn(),
  };

  return {
    default: {
      createLogger: vi.fn(() => mockLogger),
      format: {
        combine: vi.fn(() => vi.fn()),
        timestamp: vi.fn(() => vi.fn()),
        errors: vi.fn(() => vi.fn()),
        label: vi.fn(() => vi.fn()),
        printf: vi.fn(() => vi.fn()),
        colorize: vi.fn(() => vi.fn()),
        simple: vi.fn(() => vi.fn()),
        json: vi.fn(() => vi.fn()),
      },
      transports: {
        Console: vi.fn(),
      },
    },
  };
});

if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
    }

    cb: ResizeObserverCallback;

    observe() {
      // Mock implementation
    }

    unobserve() {
      // Mock implementation
    }

    disconnect() {
      // Mock implementation
    }
  };
}

vi.mock('./shared/utils/getEnvVar', () => ({
  getEnvVar: vi.fn((name: string, defaultValue = '') => {
    return defaultValue;
  }),
}));

if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj: unknown) => {
    if (obj === undefined) return undefined;
    if (obj === null) return null;
    return JSON.parse(JSON.stringify(obj));
  };
}

if (typeof global.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Proper mocks for Chakra UI v3 testing environment
// Based on: https://www.chakra-ui.com/docs/components/concepts/testing
if (typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    root = null;
    rootMargin = '';
    thresholds: number[] = [];

    constructor(
      _callback: IntersectionObserverCallback,
      _options?: IntersectionObserverInit,
    ) {
      // Mock constructor
    }
    observe() {
      // Mock implementation
    }
    unobserve() {
      // Mock implementation
    }
    disconnect() {
      // Mock implementation
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  };
}

if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(cb, 1000 / 60);
  global.cancelAnimationFrame = (id: number) => clearTimeout(id);
}

if (typeof Element !== 'undefined') {
  Element.prototype.scrollTo =
    Element.prototype.scrollTo ||
    function () {
      // Mock implementation
    };
  Element.prototype.scrollIntoView =
    Element.prototype.scrollIntoView ||
    function () {
      // Mock implementation
    };
}

export {};
