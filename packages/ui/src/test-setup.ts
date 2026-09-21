import '@testing-library/jest-dom';

global.ResizeObserver = class ResizeObserver {
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }

  cb: ResizeObserverCallback;

  observe() {
    // no-op
  }

  unobserve() {
    // no-op
  }

  disconnect() {
    // no-op
  }
};

// jsdom's window does not provide structuredClone.
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj: unknown) => {
    return JSON.parse(JSON.stringify(obj));
  };
}
