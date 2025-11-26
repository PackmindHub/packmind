export const nxPreset = {
  // This is one of the patterns that jest finds by default https://jestjs.io/docs/configuration#testmatch-arraystring
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  resolver: '@nx/jest/plugins/resolver',
  moduleFileExtensions: ['ts', 'js', 'mjs', 'html'],
  coverageReporters: ['html'],
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
  transform: {
    '^.+\\.(ts|js|html)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        isolatedModules: true, // Faster compilation, less memory
      },
    ],
  },
  testEnvironment: 'jsdom',
  /**
   * manually set the exports names to load in common js, to mimic the behaviors of jest 27
   * before jest didn't fully support package exports and would load in common js code (typically via main field). now jest 28+ will load in the browser esm code, but jest esm support is not fully supported.
   * In this case we will tell jest to load in the common js code regardless of environment.
   *
   * this can be removed via just overriding this setting in it's usage
   *
   * @example
   * module.exports = {
   *   ...nxPreset,
   *   testEnvironmentOptions: {},
   * }
   */
  testEnvironmentOptions: {
    customExportConditions: ['node', 'require', 'default'],
  },
  testTimeout: 20000, // 20 seconds
  passWithNoTests: true, // Allow packages without tests to pass

  // Memory optimizations
  maxWorkers: '25%', // Limit parallel workers to 1
  workerIdleMemoryLimit: '512MB', // Kill workers using more than 512MB when idle

  // Force worker cleanup to prevent memory leaks
  forceExit: true, // Force exit after tests complete (prevents hanging workers)

  // Clear mocks and cache between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Detect memory leaks
  detectLeaks: false, // Can be enabled for debugging, but slows down tests significantly
  detectOpenHandles: false, // Can enable to find leaking handles, but adds overhead

  // Force garbage collection between test files (requires --expose-gc flag)
  // This is handled in the test script
};
