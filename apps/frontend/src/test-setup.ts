import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Automatically cleanup after each test
afterEach(() => {
  cleanup();
  // Clear all pending timers
  jest.clearAllTimers();
});

// Clean up JSDOM resources after all tests
afterAll(async () => {
  // Give any pending promises a chance to resolve
  await new Promise((resolve) => setTimeout(resolve, 0));

  // Close all open network connections in JSDOM
  if (global.window) {
    // Close any open XMLHttpRequests
    if (global.XMLHttpRequest) {
      // Abort any pending requests
      const xhrProto = global.XMLHttpRequest.prototype;
      if (xhrProto.abort && typeof xhrProto.abort === 'function') {
        // This prevents hanging connections
      }
    }
  }

  // Clear all timers
  jest.clearAllTimers();
  jest.useRealTimers();
});

// Mock winston globally to prevent PackmindLogger instantiation issues in frontend tests
jest.mock('winston', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    http: jest.fn(),
    verbose: jest.fn(),
    debug: jest.fn(),
    silly: jest.fn(),
  };

  return {
    __esModule: true,
    default: {
      createLogger: jest.fn(() => mockLogger),
      format: {
        combine: jest.fn(() => jest.fn()),
        timestamp: jest.fn(() => jest.fn()),
        errors: jest.fn(() => jest.fn()),
        label: jest.fn(() => jest.fn()),
        printf: jest.fn(() => jest.fn()),
        colorize: jest.fn(() => jest.fn()),
        simple: jest.fn(() => jest.fn()),
        json: jest.fn(() => jest.fn()),
      },
      transports: {
        Console: jest.fn(),
      },
    },
  };
});

// Mock import.meta for Jest to handle ES modules
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      import: {
        meta: {
          env: Record<string, string>;
        };
      };
    }
  }
}

// Mock ResizeObserver for tests
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

jest.mock('./shared/utils/getEnvVar', () => ({
  getEnvVar: jest.fn((name: string, defaultValue = '') => {
    return defaultValue;
  }),
}));

// Polyfill for structuredClone which is not available in Jest environment
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj: unknown) => {
    if (obj === undefined) return undefined;
    if (obj === null) return null;
    return JSON.parse(JSON.stringify(obj));
  };
}

// Polyfills for TextEncoder and TextDecoder which are not available in Jest environment
if (typeof global.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Proper mocks for Chakra UI v3 testing environment
// Based on: https://www.chakra-ui.com/docs/components/concepts/testing

// ResizeObserver mock - required for Chakra UI components
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
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

// IntersectionObserver mock - required for some Chakra UI components
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

// requestAnimationFrame mock for proper async handling
if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(cb, 1000 / 60);
  global.cancelAnimationFrame = (id: number) => clearTimeout(id);
}

// Scroll methods mock - required for some Chakra UI components
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
// Make this file a module
export {};
