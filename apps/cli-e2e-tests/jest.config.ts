const {
  swcTransformWithDefineFields,
  standardModuleFileExtensions,
} = require('../../jest-utils.ts');

module.exports = {
  displayName: 'cli-e2e-tests',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: swcTransformWithDefineFields,
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/apps/cli-e2e-tests',
  testTimeout: 30000, // E2E tests may take longer
  setupFilesAfterEnv: ['<rootDir>/src/helpers/matchers.ts'],
};
