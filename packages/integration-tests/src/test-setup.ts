// Global setup for integration tests to mock Redis connections

// Mock the queueFactory function to avoid Redis connections
jest.mock('@packmind/jobs', () => {
  const actual = jest.requireActual('@packmind/jobs');

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
  };
});

// Mock only the Configuration class, not the entire @packmind/shared module
jest.mock('@packmind/shared', () => {
  const actual = jest.requireActual('@packmind/shared');
  return {
    ...actual,
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
