const { compilerOptions } = require('../../tsconfig.base.effective.json');

const {
  pathsToModuleNameMapper,
  swcTransformWithDecorators,
  standardModuleFileExtensions,
} = require('../../jest-utils.ts');

module.exports = {
  displayName: '@packmind/integration-tests',
  preset: '../../jest.preset.ts',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  transform: swcTransformWithDecorators,
  transformIgnorePatterns: ['node_modules/(?!(slug)/)'],
  moduleFileExtensions: standardModuleFileExtensions,
  coverageDirectory: '../../coverage/packages/integration-tests',
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths,
    '<rootDir>/../../',
  ),
  testTimeout: 30000,
  // Run integration tests in parallel - each test file uses its own database fixture
  maxWorkers: 4,
};
