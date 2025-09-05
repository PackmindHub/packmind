import '@testing-library/jest-dom';

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

// Set up import.meta mock
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      env: {
        VITE_PACKMIND_API_BASE_URL: 'http://localhost:3003/api',
      },
    },
  },
});

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
// Make this file a module
export {};
