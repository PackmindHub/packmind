// Global Jest setup file
// This file runs once before all tests in each worker

// Force garbage collection after each test file if --expose-gc flag is set
if (global.gc) {
  afterAll(() => {
    global.gc();
  });
}

// Set longer timeout for database operations
jest.setTimeout(20000);

// Ensure all timers are cleared after each test
afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
});
