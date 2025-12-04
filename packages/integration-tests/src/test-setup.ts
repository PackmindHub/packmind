// Global setup for integration tests to mock Redis connections

// Increase timeout for integration tests (hooks and tests)
jest.setTimeout(60000);

// Mock the queueFactory and Configuration from @packmind/node-utils
jest.mock('@packmind/node-utils', () => {
  const actual = jest.requireActual('@packmind/node-utils');

  // Simple mock that implements the IQueue interface
  const createMockQueue = () => ({
    addJob: jest.fn().mockResolvedValue('mock-job-id'),
    cancelJob: jest.fn().mockResolvedValue(undefined),
    addWorker: jest.fn().mockResolvedValue(null),
  });

  return {
    ...actual,
    queueFactory: jest
      .fn()
      .mockImplementation(() => Promise.resolve(createMockQueue())),
    Configuration: {
      getConfig: jest.fn().mockImplementation((key: string) => {
        if (key === 'ENCRYPTION_KEY') {
          return Promise.resolve('random-encryption-key-for-testing');
        }
        return Promise.resolve(null);
      }),
    },
  };
});
