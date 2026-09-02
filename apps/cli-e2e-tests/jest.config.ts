const {
  swcTransformWithDefineFields,
  standardModuleFileExtensions,
} = require('../../jest-utils.ts');

// Jest defaults to `nproc - 1` workers, which on the 8-core CI runner is 7 —
// sharing those cores with the six containers this suite tests against. Left
// at the default unless `CLI_E2E_MAX_WORKERS` is set, so the worker count can
// be varied from the workflow without another commit, and so a timing run
// measures the configuration that actually fails.
const maxWorkersOverride = process.env['CLI_E2E_MAX_WORKERS'];

module.exports = {
  displayName: 'cli-e2e-tests',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: swcTransformWithDefineFields,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/apps/cli-e2e-tests',
  testTimeout: 30000, // E2E tests may take longer
  ...(maxWorkersOverride ? { maxWorkers: Number(maxWorkersOverride) } : {}),
  setupFilesAfterEnv: [
    '<rootDir>/src/helpers/matchers.ts',
    '<rootDir>/src/helpers/setupCliVersion.ts',
    '<rootDir>/src/helpers/setupTiming.ts',
  ],
};
