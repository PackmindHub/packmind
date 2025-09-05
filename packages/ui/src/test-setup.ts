import '@testing-library/jest-dom';

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

// Polyfill for structuredClone which is not available in Jest environment
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj: unknown) => {
    return JSON.parse(JSON.stringify(obj));
  };
}
