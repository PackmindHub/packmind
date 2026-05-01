// eslint-disable-next-line @nx/enforce-module-boundaries
import { compilerOptions } from '../../tsconfig.base.effective.json';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  pathsToModuleNameMapper,
  swcTransformWithDecorators,
  standardModuleFileExtensions,
} from '../../jest-utils';

export default {
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
  // 60s accommodates Testcontainers cold-start when the container backend is
  // used; the default pg-mem backend remains well under this.
  testTimeout: 60000,
  // Run integration tests in parallel - each test file uses its own database fixture
  maxWorkers: 4,
};
